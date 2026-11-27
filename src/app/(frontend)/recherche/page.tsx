import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '../../../components/ArticleCard'
import { LatestList } from '../../../components/LatestList'
import { SectionTitle } from '../../../components/SectionTitle'
import { getArticles, normalizeSearch, searchArticles } from '../../../lib/queries'

// Résultats calculés à chaque requête : jamais mis en cache (ni par Next, ni par Cloudflare,
// qui respecte l'en-tête « Cache-Control: private, no-store » des pages dynamiques).
export const dynamic = 'force-dynamic'

const PER_PAGE = 12

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }

const pageHref = (q: string, page: number) =>
  `/recherche?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = normalizeSearch((await searchParams).q)
  return {
    title: q ? `Recherche : ${q}` : 'Recherche',
    // Les pages de résultats n'ont pas à être indexées par les moteurs.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = normalizeSearch(params.q)
  const rawPage = Number(Array.isArray(params.page) ? params.page[0] : params.page)
  const page = Number.isInteger(rawPage) && rawPage > 1 ? Math.min(rawPage, 500) : 1

  const [res, latest] = await Promise.all([
    q.length >= 2 ? searchArticles(q, { limit: PER_PAGE, page }) : null,
    getArticles({ limit: 10 }),
  ])

  return (
    <div className="container layout">
      <div className="layout__main">
        <SectionTitle title="Recherche" />

        <form action="/recherche" method="get" role="search" className="search-page__form">
          <label htmlFor="recherche-q" className="sr-only">
            Rechercher un article
          </label>
          <input
            id="recherche-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Un mot, un nom, un lieu…"
            autoComplete="off"
            enterKeyHint="search"
            minLength={2}
            maxLength={100}
            required
          />
          <button type="submit" className="btn">
            Rechercher
          </button>
        </form>

        {!res && (
          <p className="empty">
            {q ? 'Tapez au moins 2 caractères.' : 'Tapez un mot pour retrouver un article.'}
          </p>
        )}

        {res && (
          <p className="search-page__count" aria-live="polite">
            {res.totalDocs === 0 ? (
              <>
                Aucun article ne correspond à « <strong>{q}</strong> ». Essayez un autre mot ou une
                orthographe différente (avec ou sans accents).
              </>
            ) : (
              <>
                {res.totalDocs} résultat{res.totalDocs > 1 ? 's' : ''} pour « <strong>{q}</strong> »
              </>
            )}
          </p>
        )}

        {res && res.docs.length > 0 && (
          <div className="search-page__results">
            {res.docs.map((a, i) => (
              <ArticleCard key={a.id} article={a} variant="row" priority={i === 0} />
            ))}
          </div>
        )}

        {res && res.totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            {res.hasPrevPage ? (
              <Link href={pageHref(q, page - 1)} rel="prev">
                ← Précédents
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {res.page} / {res.totalPages}
            </span>
            {res.hasNextPage ? (
              <Link href={pageHref(q, page + 1)} rel="next">
                Suivants →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
      <aside className="layout__aside">
        <LatestList articles={latest.docs} />
      </aside>
    </div>
  )
}
