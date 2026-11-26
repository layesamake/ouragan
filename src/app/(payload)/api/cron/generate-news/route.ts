import { timingSafeEqual } from 'node:crypto'

import type { Payload } from 'payload'

import { ensureDefaultCategories } from '@/lib/defaultCategories'
import { blocksToLexical } from '@/lib/lexicalFormatter'
import { findCoverImage } from '@/lib/newsImages'
import {
  collectSource,
  extractArticleText,
  MIN_TEXT_CHARS,
  type SourceItem,
} from '@/lib/newsCollector'
import { excludedBy, MAX_CREATED_PER_RUN, MAX_PER_SOURCE, NEWS_SOURCES } from '@/lib/newsSources'
import { rewriteArticle, type CategoryChoice } from '@/lib/newsWriter'
import { getClient } from '@/lib/queries'
import { slugify } from '@/lib/slugify'

/**
 * GET /api/cron/generate-news — rédaction IA quotidienne.
 * Lit les derniers articles de 6 médias sénégalais, écarte les doublons et les
 * faits divers, les fait réécrire par Claude et les enregistre en BROUILLON
 * pour relecture dans /admin, avec la photo d'origine de l'article (créditée au
 * média), ou à défaut une photo sous licence libre (Wikimedia Commons, puis Pexels).
 * Protégée par l'en-tête « Authorization: Bearer <CRON_SECRET> ».
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Cloudflare coupe la connexion à 100 s : on arrête d'entamer des articles après ce délai. */
const TIME_BUDGET_MS = 75_000
/** Médias traités en même temps. */
const CONCURRENCY = 3
/** Articles regardés au plus dans chaque flux. */
const MAX_LOOKED_AT_PER_SOURCE = 10

type Detail = {
  source: string
  title: string
  url: string
  status: 'created' | 'duplicate' | 'filtered' | 'too_short' | 'error' | 'not_processed'
  reason?: string
  id?: number
  /** Crédit de la photo ajoutée, ou raison de son absence. */
  cover?: string
  /** Vidéos de l'article d'origine intégrées au brouillon. */
  videos?: string[]
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function isDuplicate(payload: Payload, url: string): Promise<boolean> {
  const found = await payload.find({
    collection: 'articles',
    draft: true,
    overrideAccess: true,
    where: { sourceUrl: { equals: url } },
    limit: 1,
    depth: 0,
    pagination: false,
    select: {},
  })
  return found.docs.length > 0
}

async function uniqueSlug(payload: Payload, title: string): Promise<string> {
  const base = slugify(title) || `article-${Date.now()}`
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 115)}-${n}`
    const found = await payload.find({
      collection: 'articles',
      draft: true,
      overrideAccess: true,
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      pagination: false,
      select: {},
    })
    if (!found.docs.length) return candidate
  }
  return `${base.slice(0, 100)}-${Date.now()}`
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { success: false, error: 'ANTHROPIC_API_KEY manquante sur le serveur' },
      { status: 500 },
    )
  }

  const startedAt = Date.now()
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - startedAt)
  const payload = await getClient()

  // Rubriques proposées à l'IA (jamais « Vidéos » pour un article texte).
  let cats = await payload.find({ collection: 'categories', sort: 'order', limit: 50, depth: 0 })
  if (!cats.docs.length) {
    await ensureDefaultCategories(payload)
    cats = await payload.find({ collection: 'categories', sort: 'order', limit: 50, depth: 0 })
  }
  const categories: CategoryChoice[] = cats.docs
    .filter((c) => c.slug !== 'videos')
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug || '' }))
  if (!categories.length) {
    return Response.json({ success: false, error: 'Aucune rubrique disponible' }, { status: 500 })
  }
  const validCategory = (id: number) =>
    categories.some((c) => c.id === id) ? id : categories[0].id

  const summary = {
    totalChecked: 0,
    created: 0,
    skippedDuplicates: 0,
    skippedFiltered: 0,
    skippedTooShort: 0,
    notProcessed: 0,
    errors: 0,
    withCover: 0,
    withVideo: 0,
  }
  const usedPhotos = new Set<string>()
  const details: Detail[] = []
  const sources: {
    source: string
    via?: 'rss' | 'html'
    found: number
    error?: string
    rssError?: string
  }[] = []

  // 1. Collecte des 6 médias en parallèle.
  const collected = await Promise.allSettled(NEWS_SOURCES.map((s) => collectSource(s)))

  const queues: SourceItem[][] = []
  collected.forEach((res, i) => {
    const name = NEWS_SOURCES[i].name
    if (res.status === 'rejected') {
      summary.errors++
      sources.push({ source: name, found: 0, error: message(res.reason) })
      return
    }
    sources.push({
      source: name,
      via: res.value.via,
      found: res.value.items.length,
      rssError: res.value.rssError,
    })
    queues.push(res.value.items.slice(0, MAX_LOOKED_AT_PER_SOURCE))
  })

  // 2. Traitement : chaque média s'arrête à MAX_PER_SOURCE articles créés.
  const processOne = async (item: SourceItem): Promise<boolean> => {
    const base = { source: item.source.name, title: item.title, url: item.url }
    summary.totalChecked++

    const excluded = excludedBy(item)
    if (excluded) {
      summary.skippedFiltered++
      details.push({ ...base, status: 'filtered', reason: `rubrique exclue : ${excluded}` })
      return false
    }
    if (await isDuplicate(payload, item.url)) {
      summary.skippedDuplicates++
      details.push({ ...base, status: 'duplicate' })
      return false
    }
    const { text, imageUrl, videos } = await extractArticleText(item)
    if (text.length < MIN_TEXT_CHARS) {
      summary.skippedTooShort++
      details.push({ ...base, status: 'too_short', reason: `${text.length} caractères` })
      return false
    }
    const result = await rewriteArticle({
      source: item.source,
      url: item.url,
      title: item.title,
      text,
      categories,
    })
    if (result.skip) {
      summary.skippedFiltered++
      details.push({ ...base, status: 'filtered', reason: result.reason })
      return false
    }
    if (summary.created >= MAX_CREATED_PER_RUN) {
      summary.notProcessed++
      details.push({ ...base, status: 'not_processed', reason: 'plafond atteint' })
      return false
    }
    summary.created++ // réservé avant l'écriture, pour respecter le plafond entre médias
    try {
      // Photo sous licence libre ; son absence n'empêche pas de créer le brouillon.
      let cover: number | null = null
      let coverNote: string | undefined
      try {
        const found = await findCoverImage(payload, {
          source: { name: item.source.name, homepage: item.source.homepage, imageUrl },
          subject: result.imageSubject,
          queries: result.imageQueries,
          alt: result.title,
          used: usedPhotos,
        })
        cover = found?.id ?? null
        coverNote = found?.credit ?? 'aucune photo libre trouvée'
      } catch (err) {
        coverNote = `photo : ${message(err)}`
      }
      const doc = await payload.create({
        collection: 'articles',
        draft: true,
        overrideAccess: true,
        data: {
          _status: 'draft',
          title: result.title,
          slug: await uniqueSlug(payload, result.title),
          excerpt: result.excerpt,
          kicker: result.kicker || undefined,
          content: blocksToLexical(
            result.blocks,
            { name: item.source.name, url: item.url },
            videos,
          ),
          category: validCategory(result.categoryId),
          sourceName: item.source.name,
          sourceUrl: item.url,
          ...(cover ? { cover } : {}),
        },
      })
      if (cover) summary.withCover++
      if (videos.length) summary.withVideo++
      details.push({
        ...base,
        title: result.title,
        status: 'created',
        id: doc.id,
        cover: coverNote,
        ...(videos.length ? { videos } : {}),
      })
      return true
    } catch (err) {
      summary.created--
      throw err
    }
  }

  const processQueue = async (queue: SourceItem[]) => {
    let createdHere = 0
    for (const item of queue) {
      if (createdHere >= MAX_PER_SOURCE) break
      if (summary.created >= MAX_CREATED_PER_RUN || timeLeft() <= 0) {
        summary.notProcessed++
        details.push({
          source: item.source.name,
          title: item.title,
          url: item.url,
          status: 'not_processed',
          reason: timeLeft() <= 0 ? 'temps écoulé (repris au prochain passage)' : 'plafond atteint',
        })
        continue
      }
      try {
        if (await processOne(item)) createdHere++
      } catch (err) {
        summary.errors++
        details.push({
          source: item.source.name,
          title: item.title,
          url: item.url,
          status: 'error',
          reason: message(err),
        })
        payload.logger.error(`Rédaction IA — ${item.source.name} — ${item.url} : ${message(err)}`)
      }
    }
  }

  const pending = [...queues]
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      for (let q = pending.shift(); q; q = pending.shift()) await processQueue(q)
    }),
  )

  payload.logger.info(
    `Rédaction IA : ${summary.created} brouillon(s) créé(s) en ${Math.round((Date.now() - startedAt) / 1000)} s`,
  )
  return Response.json({
    success: true,
    durationMs: Date.now() - startedAt,
    summary,
    sources,
    details,
  })
}
