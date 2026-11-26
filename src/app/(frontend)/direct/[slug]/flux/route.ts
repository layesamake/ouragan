import { getClient } from '../../../../../lib/queries'
import { FEED_LIMIT, getFeedCached, toFeedEntry } from '../../../../../lib/liveFeed'

/**
 * GET /direct/<slug>/flux — derniers messages d'un direct, interrogé toutes les
 * 10 s par les lecteurs de la page. Volontairement hors de /api : Cloudflare peut
 * mettre la réponse en cache quelques secondes (s-maxage), si bien que des milliers
 * de lecteurs ne génèrent qu'une poignée de requêtes vers le serveur.
 */
export const dynamic = 'force-dynamic'

const json = (body: unknown, maxAge: number, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`,
    },
  })

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getClient()
  const feed = await getFeedCached(payload, slug)
  if (!feed) return json({ error: 'introuvable' }, 30, 404)

  // ?before=<id> : messages plus anciens (« Voir les messages précédents »).
  const before = Number(new URL(req.url).searchParams.get('before'))
  if (Number.isInteger(before) && before > 0) {
    const res = await payload.find({
      collection: 'live-entries',
      where: { and: [{ live: { equals: feed.id } }, { id: { less_than: before } }] },
      sort: '-createdAt',
      limit: FEED_LIMIT,
      depth: 1,
      overrideAccess: false,
    })
    return json({ entries: res.docs.map(toFeedEntry), hasMore: res.hasNextPage }, 60)
  }

  return json(feed, feed.status === 'live' ? 5 : 60)
}
