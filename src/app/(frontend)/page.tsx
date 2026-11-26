import Link from 'next/link'

import { ArticleCard } from '../../components/ArticleCard'
import { LatestList } from '../../components/LatestList'
import { SectionTitle } from '../../components/SectionTitle'
import { Ticker } from '../../components/Ticker'
import { getArticles, getCategories } from '../../lib/queries'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featuredRes, latestRes, breakingRes, categories] = await Promise.all([
    getArticles({ featured: true, limit: 5 }),
    getArticles({ limit: 12 }),
    getArticles({ breaking: true, limit: 8 }),
    getCategories(),
  ])

  // « À la une » : articles cochés, complétés par les plus récents si besoin.
  const featured = [...featuredRes.docs]
  for (const a of latestRes.docs) {
    if (featured.length >= 5) break
    if (!featured.some((f) => f.id === a.id)) featured.push(a)
  }
  const [lead, ...secondary] = featured
  const usedIds = featured.map((a) => a.id)

  const homeCategories = categories.filter((c) => c.showOnHome !== false)
  const blocks = await Promise.all(
    homeCategories.map(async (category) => ({
      category,
      articles: (await getArticles({ categoryId: category.id, limit: 4, excludeIds: usedIds }))
        .docs,
    })),
  )

  return (
    <>
      <Ticker articles={breakingRes.docs} />
      <div className="container layout">
        <div className="layout__main">
          {lead ? (
            <section className="une" aria-labelledby="une-title">
              <h2 id="une-title" className="sr-only">
                À la une
              </h2>
              <ArticleCard article={lead} variant="hero" priority />
              {secondary.length > 0 && (
                <div className="une__grid">
                  {secondary.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="card" />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="welcome">
              <h2>Bienvenue sur Ouragan.sn</h2>
              <p>
                Aucun article publié pour l&apos;instant. Connectez-vous à{' '}
                <Link href="/admin">l&apos;administration</Link> pour publier le premier.
              </p>
            </section>
          )}

          {blocks
            .filter((b) => b.articles.length > 0)
            .map(({ category, articles: [first, ...rest] }) => (
              <section key={category.id} className="block">
                <SectionTitle
                  title={category.name}
                  href={`/rubrique/${category.slug}`}
                  color={category.color}
                />
                <div className="block__grid">
                  <ArticleCard article={first} variant="card" />
                  <div className="block__list">
                    {rest.map((a) => (
                      <ArticleCard key={a.id} article={a} variant="row" showCategory={false} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
        </div>

        <aside className="layout__aside">
          <LatestList articles={latestRes.docs} />
        </aside>
      </div>
    </>
  )
}
