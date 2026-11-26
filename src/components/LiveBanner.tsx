import Link from 'next/link'

import { formatTime } from '../lib/format'
import { getLiveEntries } from '../lib/liveFeed'
import { buildSafe, getActiveLives, getClient } from '../lib/queries'

/** Bandeau rouge « En direct » en haut de l'accueil, quand un direct est en cours. */
export async function LiveBanner() {
  const lives = await getActiveLives()
  if (!lives.length) return null
  const payload = await getClient()
  const items = await Promise.all(
    lives.map(async (live) => ({
      live,
      last: (await buildSafe(() => getLiveEntries(payload, live.id, 1), { entries: [], total: 0 }))
        .entries[0],
    })),
  )

  return (
    <section className="live-banner" aria-label="Directs en cours">
      <div className="container">
        {items.map(({ live, last }) => (
          <Link key={live.id} href={`/direct/${live.slug}`} className="live-banner__item">
            <span className="live-banner__label">
              <span className="dot dot--white" aria-hidden="true" /> En direct
            </span>
            <span className="live-banner__body">
              <strong className="live-banner__title">{live.title}</strong>
              {last && (
                <span className="live-banner__last">
                  <time dateTime={last.createdAt}>{formatTime(last.createdAt)}</time>{' '}
                  {(last.title || last.text).slice(0, 140)}
                </span>
              )}
            </span>
            <span className="live-banner__cta" aria-hidden="true">
              Suivre →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
