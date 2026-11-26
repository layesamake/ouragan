import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArticleCard } from './ArticleCard'
import { LatestList } from './LatestList'
import { SectionTitle } from './SectionTitle'
import { getArticles, getCategoryBySlug } from '../lib/queries'

const PER_PAGE = 13

const pageHref = (slug: string, page: number) =>
  page <= 1 ? `/rubrique/${slug}` : `/rubrique/${slug}/page/${page}`

export async function categoryMetadata(slug: string, page = 1): Promise<Metadata> {
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: page > 1 ? `${category.name} — page ${page}` : category.name,
    description: category.description || `Toute l'actualité ${category.name} sur Ouragan.sn.`,
    alternates: { canonical: pageHref(category.slug || slug, page) },
  }
}

/** Page de rubrique (partagée par /rubrique/[slug] et /rubrique/[slug]/page/[n]). */
export async function CategoryView({ slug, page }: { slug: string; page: number }) {
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const [res, latest] = await Promise.all([
    getArticles({ categoryId: category.id, limit: PER_PAGE, page }),
    getArticles({ limit: 10 }),
  ])
  if (page > 1 && res.docs.length === 0) notFound()
  const [lead, ...rest] = res.docs

  return (
    <div className="container layout">
      <div className="layout__main">
        <SectionTitle title={category.name} color={category.color} />
        {category.description && <p className="lede">{category.description}</p>}

        {!lead && <p className="empty">Aucun article dans cette rubrique pour le moment.</p>}
        {lead && page === 1 && (
          <ArticleCard article={lead} variant="hero" showCategory={false} priority />
        )}
        <div className="grid-cards">
          {(page === 1 ? rest : res.docs).map((a) => (
            <ArticleCard key={a.id} article={a} variant="card" showCategory={false} />
          ))}
        </div>

        {res.totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            {res.hasPrevPage && (
              <Link href={pageHref(slug, page - 1)} rel="prev">
                ← Plus récents
              </Link>
            )}
            <span>
              Page {page} / {res.totalPages}
            </span>
            {res.hasNextPage && (
              <Link href={pageHref(slug, page + 1)} rel="next">
                Plus anciens →
              </Link>
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
