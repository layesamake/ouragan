import type { Payload } from 'payload'

import type { Live, LiveEntry } from '../payload-types'
import { asMedia, imageUrl } from './format'

/** Message d'un direct tel qu'envoyé au navigateur (page et flux JSON). */
export type FeedEntry = {
  id: number
  createdAt: string
  updatedAt: string
  title: string | null
  text: string
  important: boolean
  image: { src: string; alt: string; width: number; height: number } | null
  article: { slug: string; title: string } | null
}

export type Feed = {
  id: number
  status: 'live' | 'ended' | 'draft'
  title: string
  entries: FeedEntry[]
}

/** Nombre de messages envoyés par le flux (les plus récents). */
export const FEED_LIMIT = 40

export function toFeedEntry(e: LiveEntry): FeedEntry {
  const media = asMedia(e.image)
  const src = imageUrl(media, 'hero')
  const article =
    e.article && typeof e.article === 'object' && e.article._status === 'published'
      ? { slug: e.article.slug || '', title: e.article.title }
      : null
  return {
    id: e.id,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    title: e.title || null,
    text: e.text,
    important: Boolean(e.important),
    image:
      media && src
        ? {
            src,
            alt: media.alt || '',
            width: media.sizes?.hero?.width || media.width || 1280,
            height: media.sizes?.hero?.height || media.height || 720,
          }
        : null,
    article: article?.slug ? article : null,
  }
}

export async function getLiveEntries(payload: Payload, liveId: number, limit = FEED_LIMIT) {
  const res = await payload.find({
    collection: 'live-entries',
    where: { live: { equals: liveId } },
    sort: '-createdAt',
    limit,
    depth: 1,
    overrideAccess: false,
  })
  return { entries: res.docs.map(toFeedEntry), total: res.totalDocs }
}

export async function findLiveBySlug(payload: Payload, slug: string): Promise<Live | null> {
  const res = await payload.find({
    collection: 'lives',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
}

/*
 * Petit cache mémoire du flux : même si Cloudflare ne met pas la réponse en cache,
 * la base n'est interrogée qu'une fois toutes les quelques secondes par direct,
 * quel que soit le nombre de lecteurs. Vidé dès qu'un message est publié.
 */
const FEED_TTL_MS = 4000
const feedCache = new Map<string, { at: number; feed: Promise<Feed | null> }>()

export function clearFeedCache(slug?: string | null) {
  if (slug) feedCache.delete(slug)
  else feedCache.clear()
}

export function getFeedCached(payload: Payload, slug: string): Promise<Feed | null> {
  const hit = feedCache.get(slug)
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.feed
  const feed = (async (): Promise<Feed | null> => {
    const live = await findLiveBySlug(payload, slug)
    if (!live) return null
    const { entries } = await getLiveEntries(payload, live.id)
    return { id: live.id, status: live.status, title: live.title, entries }
  })()
  feed.catch(() => feedCache.delete(slug))
  feedCache.set(slug, { at: Date.now(), feed })
  if (feedCache.size > 50) feedCache.delete(feedCache.keys().next().value as string)
  return feed
}
