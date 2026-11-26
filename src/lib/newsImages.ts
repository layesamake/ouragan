import type { Payload } from 'payload'
import sharp from 'sharp'

import { HTTP_HEADERS } from './newsSources'

/**
 * Photo principale des brouillons IA, dans cet ordre (choix de la rédaction) :
 * 1. la photo d'origine de l'article, créditée « Photo : <média> » ;
 * 2. sinon Wikimedia Commons : photo de la personne ou du lieu principal
 *    (licences CC0, CC BY, CC BY-SA, domaine public — auteur et licence crédités) ;
 * 3. sinon Pexels : photo thématique (si PEXELS_API_KEY est définie).
 */

const TIMEOUT_MS = 10_000
/** Wikimedia demande un User-Agent identifiant le robot. */
const USER_AGENT = 'OuraganSN-RedactionIA/1.0 (https://ouragan.sn)'

type Candidate = {
  key: string
  url: string
  credit: string
  ext: string
  headers?: Record<string, string>
}

/** Une vraie photo fait au moins cette largeur (écarte vignettes et icônes). */
const MIN_WIDTH = 400

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const FREE_LICENSE = /^(cc0|cc[ -]by(-sa)?([ -][\d.]+)?|public domain|pd\b|attribution)/i
/** Fichiers qui ne sont pas des photos d'illustration. */
const NOT_A_PHOTO =
  /\b(map|carte|flag|drapeau|logo|coat of arms|blason|armoiries|locator|signature|diagram)\b/i

/** Photo libre de la personne ou du lieu `subject` sur Wikimedia Commons. */
async function searchCommons(subject: string, used: Set<string>): Promise<Candidate | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  for (const [k, v] of Object.entries({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${subject} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1600',
  })) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Wikimedia HTTP ${res.status}`)
  type Info = {
    mime: string
    width: number
    height: number
    thumburl?: string
    url: string
    extmetadata?: Record<string, { value?: string }>
  }
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { title: string; index: number; imageinfo?: Info[] }> }
  }
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index)
  const words = subject
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)

  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue
    if (info.width < 600 || NOT_A_PHOTO.test(page.title)) continue
    // Le nom du fichier doit évoquer le sujet (évite les résultats sans rapport).
    const title = page.title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (words.length && !words.some((w) => title.includes(w))) continue
    const meta = info.extmetadata || {}
    const license = stripHtml(meta.LicenseShortName?.value || '')
    if (!FREE_LICENSE.test(license)) continue
    const key = `commons:${page.title}`
    if (used.has(key)) continue
    const artist = stripHtml(meta.Artist?.value || '').slice(0, 80) || 'Auteur inconnu'
    return {
      key,
      url: info.thumburl || info.url,
      credit: `Photo : ${artist} / Wikimedia Commons (${license})`,
      ext: info.mime === 'image/png' ? 'png' : 'jpg',
    }
  }
  return null
}

/** Photo thématique sur Pexels. */
async function searchPexels(query: string, used: Set<string>): Promise<Candidate | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '10')
  url.searchParams.set('orientation', 'landscape')
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const data = (await res.json()) as {
    photos?: { id: number; photographer: string; src: { large2x: string; large: string } }[]
  }
  const photo = (data.photos || []).find((p) => !used.has(`pexels:${p.id}`))
  if (!photo) return null
  return {
    key: `pexels:${photo.id}`,
    url: photo.src.large2x || photo.src.large,
    credit: `Photo : ${photo.photographer} / Pexels`,
    ext: 'jpg',
  }
}

/**
 * Cherche une photo (Wikimedia Commons pour `subject`, puis Pexels pour `queries`),
 * l'importe dans la médiathèque et renvoie son id et sa provenance, ou null.
 * `used` évite de mettre la même photo sur deux brouillons d'un même passage.
 */
export async function findCoverImage(
  payload: Payload,
  args: {
    source?: { name: string; homepage: string; imageUrl?: string }
    subject: string | null
    queries: string[]
    alt: string
    used: Set<string>
  },
): Promise<{ id: number; credit: string } | null> {
  const tried: string[] = []
  // 1. Photo d'origine de l'article.
  if (args.source?.imageUrl && !args.used.has(`source:${args.source.imageUrl}`)) {
    try {
      return await importImage(payload, args, {
        key: `source:${args.source.imageUrl}`,
        url: args.source.imageUrl,
        credit: `Photo : ${args.source.name}`,
        ext: 'jpg',
        headers: { ...HTTP_HEADERS, Referer: args.source.homepage },
      })
    } catch (err) {
      tried.push(`photo d'origine : ${err instanceof Error ? err.message : err}`)
    }
  }

  let candidate: Candidate | null = null
  if (args.subject) {
    try {
      candidate = await searchCommons(args.subject, args.used)
    } catch (err) {
      payload.logger.warn(`Wikimedia Commons : ${err instanceof Error ? err.message : err}`)
    }
  }
  for (const q of args.queries.map((x) => x.trim()).filter(Boolean)) {
    if (candidate) break
    candidate = await searchPexels(q, args.used)
  }
  if (!candidate) {
    if (tried.length) payload.logger.warn(`Rédaction IA, photo : ${tried.join(' ; ')}`)
    return null
  }
  return importImage(payload, args, candidate)
}

/** Télécharge la photo, vérifie que c'en est une, et l'ajoute à la médiathèque. */
async function importImage(
  payload: Payload,
  args: { alt: string; used: Set<string> },
  candidate: Candidate,
): Promise<{ id: number; credit: string }> {
  const res = await fetch(candidate.url, {
    headers: candidate.headers || { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const mimetype = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  if (!mimetype.startsWith('image/')) throw new Error(`pas une image (${mimetype})`)
  const data = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(data).metadata()
  if (!meta.width || meta.width < MIN_WIDTH) throw new Error(`image trop petite (${meta.width} px)`)
  args.used.add(candidate.key)

  const ext = meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : candidate.ext
  const media = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: args.alt.slice(0, 200), credit: candidate.credit },
    file: {
      data,
      mimetype,
      name: `${candidate.key
        .replace(/^source:https?:\/\//, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .slice(0, 80)}.${ext}`,
      size: data.length,
    },
  })
  return { id: media.id, credit: candidate.credit }
}
