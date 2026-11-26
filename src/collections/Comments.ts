import { createHash } from 'crypto'
import type {
  PayloadRequest,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'

import { publicArticlesWhere } from '../lib/publicWhere'

const NAME_MAX = 60
const CONTENT_MAX = 1500
/** Pas plus de 3 commentaires par visiteur toutes les 10 minutes. */
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3
/** Un humain met au moins 3 secondes à écrire un commentaire. */
const MIN_FILL_MS = 3000

const articleIdOf = (a: unknown): number | null => {
  if (a && typeof a === 'object' && 'id' in a) return Number((a as { id: unknown }).id)
  return typeof a === 'number' ? a : a ? Number(a) : null
}

/** Recompte les commentaires validés d'un article et vide le cache du site. */
async function refreshArticle(req: PayloadRequest, articleId: number | null) {
  const { payload } = req
  if (articleId) {
    const { totalDocs } = await payload.count({
      collection: 'comments',
      where: { and: [{ article: { equals: articleId } }, { status: { equals: 'approved' } }] },
      overrideAccess: true,
      req, // même transaction : voit le statut qui vient d'être enregistré
    })
    // Écriture directe : ni nouvelle version de l'article, ni hooks.
    await payload.db
      .updateOne({
        collection: 'articles',
        id: articleId,
        data: { commentsCount: totalDocs },
        returning: false,
        req,
      })
      .catch((err) => payload.logger.error(err))
  }
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // hors Next.js
  }
}

const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  // Seuls les commentaires validés (ou qui ne le sont plus) changent le site public.
  if (doc.status === 'approved' || previousDoc?.status === 'approved') {
    const ids = new Set([articleIdOf(doc.article), articleIdOf(previousDoc?.article)])
    for (const id of ids) if (id) await refreshArticle(req, id)
  }
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (doc.status === 'approved') await refreshArticle(req, articleIdOf(doc.article))
  return doc
}

const clientIp = (headers: Headers) =>
  headers.get('cf-connecting-ip') ||
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  headers.get('x-real-ip') ||
  ''

/** Empreinte de l'adresse IP (jamais stockée en clair). */
const hashIp = (ip: string) =>
  createHash('sha256')
    .update(`${process.env.PAYLOAD_SECRET || ''}:${ip}`)
    .digest('hex')
    .slice(0, 32)

const bad = (error: string, status = 400) => Response.json({ ok: false, error }, { status })

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Commentaire', plural: 'Commentaires' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['content', 'name', 'article', 'status', 'createdAt'],
    group: 'Rédaction',
    listSearchableFields: ['content', 'name'],
    description:
      'Les commentaires des lecteurs n’apparaissent sur le site qu’une fois « Validé ». Pour en valider plusieurs : cochez-les, puis « Modifier » → Statut.',
  },
  defaultSort: '-createdAt',
  hooks: { afterChange: [afterChange], afterDelete: [afterDelete] },
  access: {
    // Le public ne lit que les commentaires validés ; le rédacteur voit tout.
    read: ({ req }) => (req.user ? true : { status: { equals: 'approved' } }),
    // Les lecteurs passent uniquement par POST /api/comments/submit (anti-spam).
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  endpoints: [
    {
      // POST /api/comments/submit — formulaire « Réagir » sous les articles.
      path: '/submit',
      method: 'post',
      handler: async (req) => {
        let body: Record<string, unknown> = {}
        try {
          body = (await req.json?.()) ?? {}
        } catch {
          return bad('Requête invalide.')
        }

        // Pièges à robots : champ caché rempli, ou formulaire envoyé trop vite.
        const startedAt = Number(body.t)
        if (body.website || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
          // Réponse neutre : le robot croit avoir réussi.
          return Response.json({ ok: true })
        }

        const articleId = Number(body.article)
        const name = String(body.name ?? '')
          .replace(/\s+/g, ' ')
          .trim()
        const content = String(body.content ?? '')
          .replace(/\r\n/g, '\n')
          .trim()
        if (!Number.isInteger(articleId) || articleId <= 0) return bad('Article inconnu.')
        if (name.length < 2 || name.length > NAME_MAX)
          return bad(`Votre nom doit faire entre 2 et ${NAME_MAX} caractères.`)
        if (content.length < 3 || content.length > CONTENT_MAX)
          return bad(`Votre commentaire doit faire entre 3 et ${CONTENT_MAX} caractères.`)
        if ((content.match(/https?:\/\/|www\./gi) || []).length > 1)
          return bad('Un seul lien par commentaire, s’il vous plaît.')

        const { payload } = req
        const article = await payload.find({
          collection: 'articles',
          where: { and: [{ id: { equals: articleId } }, publicArticlesWhere()] },
          limit: 1,
          depth: 0,
          select: { title: true },
          overrideAccess: true,
        })
        if (!article.docs.length) return bad('Article inconnu.', 404)

        const ipHash = hashIp(clientIp(req.headers))
        const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
        const recent = await payload.find({
          collection: 'comments',
          where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] },
          limit: RATE_MAX,
          depth: 0,
          select: { content: true },
          overrideAccess: true,
        })
        if (recent.docs.some((c) => c.content === content))
          return bad('Ce commentaire a déjà été envoyé.', 409)
        if (recent.totalDocs >= RATE_MAX)
          return bad('Trop de commentaires d’un coup. Réessayez dans quelques minutes.', 429)

        await payload.create({
          collection: 'comments',
          data: { article: articleId, name, content, status: 'pending', ipHash },
          overrideAccess: true,
        })
        return Response.json({ ok: true })
      },
    },
  ],
  fields: [
    {
      name: 'content',
      label: 'Commentaire',
      type: 'textarea',
      required: true,
      maxLength: CONTENT_MAX,
    },
    { name: 'name', label: 'Nom', type: 'text', required: true, maxLength: NAME_MAX },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: '⏳ À valider', value: 'pending' },
        { label: '✅ Validé', value: 'approved' },
        { label: '🚫 Refusé', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'article',
      label: 'Article',
      type: 'relationship',
      relationTo: 'articles',
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      // Empreinte anonyme de l'expéditeur, pour limiter le spam.
      name: 'ipHash',
      type: 'text',
      index: true,
      access: { read: ({ req }) => Boolean(req.user) },
      admin: { hidden: true },
    },
  ],
}
