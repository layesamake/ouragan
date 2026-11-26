import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArticleCard } from '../../../../components/ArticleCard'
import { LatestList } from '../../../../components/LatestList'
import { SectionTitle } from '../../../../components/SectionTitle'
import { getArticles, getCategoryBySlug } from '../../../../lib/queries'

export const dynamic = 'force-dynamic'

const PER_PAGE = 13

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: category.name,
    description: category.description || `Toute l'actualité ${category.name} sur Ouragan.sn.`,
    alternates: { canonical: `/rubrique/${category.slug}` },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const [res, latest] = await Promise.all([
    getArticles({ categoryId: category.id, limit: PER_PAGE, page }),
    getArticles({ limit: 10 }),
  ])
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
              <Link href={`/rubrique/${category.slug}?page=${page - 1}`} rel="prev">
                ← Plus récents
              </Link>
            )}
            <span>
              Page {page} / {res.totalPages}
            </span>
            {res.hasNextPage && (
              <Link href={`/rubrique/${category.slug}?page=${page + 1}`} rel="next">
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
