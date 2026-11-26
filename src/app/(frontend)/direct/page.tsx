import type { Metadata } from 'next'
import Link from 'next/link'

import { formatDateTime } from '../../../lib/format'
import { getLives } from '../../../lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Directs',
  description: 'Les grands événements suivis en direct par Ouragan.sn.',
  alternates: { canonical: '/direct' },
}

export default async function LivesPage() {
  const lives = await getLives()
  return (
    <div className="container live-index">
      <h1>Nos directs</h1>
      {lives.length === 0 ? (
        <p className="welcome">Aucun direct pour le moment.</p>
      ) : (
        <ul className="live-index__list">
          {lives.map((l) => (
            <li key={l.id}>
              <Link href={`/direct/${l.slug}`} className="live-index__item">
                {l.status === 'live' ? (
                  <span className="live__badge">
                    <span className="dot dot--white" aria-hidden="true" /> En direct
                  </span>
                ) : (
                  <span className="live__badge live__badge--ended">Terminé</span>
                )}
                <strong>{l.title}</strong>
                {l.startedAt && (
                  <span className="live-index__date">{formatDateTime(l.startedAt)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
