import Link from 'next/link'

import type { Article } from '../payload-types'
import { asCategory, formatTime } from '../lib/format'

export function LatestList({
  articles,
  title = 'Dernières infos',
}: {
  articles: Article[]
  title?: string
}) {
  return (
    <section className="widget">
      <h2 className="widget__title">{title}</h2>
      {articles.length === 0 ? (
        <p className="empty">Aucun article pour le moment.</p>
      ) : (
        <ol className="latest">
          {articles.map((a) => {
            const cat = asCategory(a.category)
            return (
              <li key={a.id}>
                <time dateTime={a.publishedAt || undefined}>{formatTime(a.publishedAt)}</time>
                <div>
                  {cat && <span className="latest__cat">{cat.name}</span>}
                  <Link href={`/article/${a.slug}`}>{a.title}</Link>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
