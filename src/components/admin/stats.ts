import type { Payload, Where } from 'payload'

import type { Article, Category } from '../../payload-types'

export const ADMIN = '/admin'
export const editArticleURL = (id: number | string) => `${ADMIN}/collections/articles/${id}`
export const NEW_ARTICLE_URL = `${ADMIN}/collections/articles/create`
export const NEW_MEDIA_URL = `${ADMIN}/collections/media/create`
export const PENDING_COMMENTS_URL = `${ADMIN}/collections/comments?where[status][equals]=pending`

const DAY = 24 * 60 * 60 * 1000

/** Début de la journée à Dakar (UTC+0 toute l'année). */
export const startOfDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

const isPublished: Where = { _status: { equals: 'published' } }

/** Article publié avec une date future = programmé. */
export const isScheduled = (iso?: string | null) =>
  Boolean(iso && new Date(iso).getTime() > Date.now())

export const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export const formatShort = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Dakar',
      }).format(new Date(iso))
    : ''

export const categoryName = (c: Article['category'] | undefined) =>
  c && typeof c === 'object' ? (c as Category).name : ''

/** Chiffres du tableau de bord. */
export async function getDashboardData(payload: Payload) {
  const today = startOfDay()
  const weekAgo = new Date(today.getTime() - 6 * DAY)
  const now = new Date().toISOString()

  const [
    publishedToday,
    publishedWeek,
    drafts,
    allViews,
    mostRead,
    recentDrafts,
    latest,
    pendingComments,
  ] = await Promise.all([
      payload.count({
        collection: 'articles',
        where: {
          and: [
            isPublished,
            { publishedAt: { greater_than_equal: today.toISOString() } },
            { publishedAt: { less_than_equal: now } },
          ],
        },
      }),
      payload.count({
        collection: 'articles',
        where: {
          and: [
            isPublished,
            { publishedAt: { greater_than_equal: weekAgo.toISOString() } },
            { publishedAt: { less_than_equal: now } },
          ],
        },
      }),
      payload.count({ collection: 'articles', where: { _status: { equals: 'draft' } } }),
      payload.find({
        collection: 'articles',
        where: isPublished,
        pagination: false,
        depth: 0,
        select: { views: true },
      }),
      payload.find({
        collection: 'articles',
        where: { and: [isPublished, { views: { greater_than: 0 } }] },
        sort: '-views',
        limit: 5,
        depth: 0,
        select: { title: true, views: true, slug: true },
      }),
      payload.find({
        collection: 'articles',
        where: { _status: { equals: 'draft' } },
        sort: '-updatedAt',
        limit: 5,
        depth: 1,
        select: { title: true, updatedAt: true, category: true },
      }),
      payload.find({
        collection: 'articles',
        where: isPublished,
        sort: '-publishedAt',
        limit: 5,
        depth: 1,
        select: {
          title: true,
          slug: true,
          publishedAt: true,
          category: true,
          views: true,
          featured: true,
          breaking: true,
        },
      }),
      payload.count({ collection: 'comments', where: { status: { equals: 'pending' } } }),
    ])

  const totalViews = allViews.docs.reduce((sum, a) => sum + (a.views || 0), 0)

  return {
    publishedToday: publishedToday.totalDocs,
    publishedWeek: publishedWeek.totalDocs,
    drafts: drafts.totalDocs,
    totalPublished: allViews.docs.length,
    totalViews,
    mostRead: mostRead.docs,
    recentDrafts: recentDrafts.docs,
    latest: latest.docs,
    pendingComments: pendingComments.totalDocs,
  }
}

/** Chiffres détaillés de la page Statistiques. */
export async function getStatsData(payload: Payload) {
  const today = startOfDay()
  const [articles, categories] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: isPublished,
      pagination: false,
      depth: 0,
      sort: '-views',
      select: { title: true, views: true, category: true, publishedAt: true },
    }),
    payload.find({ collection: 'categories', pagination: false, depth: 0, sort: 'order' }),
  ])

  const now = Date.now()
  const live = articles.docs.filter(
    (a) => !a.publishedAt || new Date(a.publishedAt).getTime() <= now,
  )
  const scheduled = articles.docs.length - live.length

  const byCategory = categories.docs.map((c) => {
    const list = live.filter((a) => a.category === c.id)
    return {
      id: c.id,
      name: c.name,
      color: c.color || '#27a3d9',
      count: list.length,
      views: list.reduce((s, a) => s + (a.views || 0), 0),
    }
  })

  // Articles publiés par jour sur les 14 derniers jours.
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(today.getTime() - (13 - i) * DAY)
    const end = start.getTime() + DAY
    const count = live.filter((a) => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      return t >= start.getTime() && t < end
    }).length
    return {
      label: new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(start),
      count,
    }
  })

  return {
    totalPublished: live.length,
    scheduled,
    totalViews: live.reduce((s, a) => s + (a.views || 0), 0),
    top: live.slice(0, 20),
    byCategory,
    days,
  }
}
