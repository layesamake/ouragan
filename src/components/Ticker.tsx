import Link from 'next/link'

import type { Article } from '../payload-types'

export function Ticker({ articles }: { articles: Article[] }) {
  if (!articles.length) return null
  // Liste doublée pour un défilement continu.
  const items = [...articles, ...articles]
  return (
    <div className="ticker" role="region" aria-label="Flash info">
      <div className="container ticker__inner">
        <span className="ticker__label">En direct</span>
        <div className="ticker__track">
          <ul className="ticker__list" style={{ animationDuration: `${articles.length * 8}s` }}>
            {items.map((a, i) => (
              <li key={`${a.id}-${i}`} aria-hidden={i >= articles.length ? true : undefined}>
                <Link href={`/article/${a.slug}`} tabIndex={i >= articles.length ? -1 : undefined}>
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
