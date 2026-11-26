import Link from 'next/link'

import type { Article } from '../payload-types'
import { asCategory, formatTime } from '../lib/format'

/** Nombre d'articles affichés dans le bloc « Dernières infos ». */
const MAX_ITEMS = 5

export function LatestList({
  articles,
  title = 'Dernières infos',
}: {
  articles: Article[]
  title?: string
}) {
  const items = articles.slice(0, MAX_ITEMS)
  return (
    <section className="widget">
      <h2 className="widget__title">{title}</h2>
      {items.length === 0 ? (
        <p className="empty">Aucun article pour le moment.</p>
      ) : (
        <ol className="latest">
          {items.map((a) => {
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
