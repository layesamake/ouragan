import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { after } from 'next/server'

import { ArticleCard } from '../../../../components/ArticleCard'
import { LatestList } from '../../../../components/LatestList'
import { ShareBar } from '../../../../components/ShareBar'
import { asAuthor, asCategory, asMedia, formatDateTime, imageUrl } from '../../../../lib/format'
import { formatViews } from '../../../../lib/format'
import { getArticleBySlug, getArticles, incrementViews } from '../../../../lib/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  const cover = imageUrl(asMedia(article.cover), 'hero')
  return {
    title: article.title,
    description: article.excerpt || undefined,
    alternates: { canonical: `/article/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt || undefined,
      publishedTime: article.publishedAt || undefined,
      images: cover ? [cover] : ['/logo-ouragan.png'],
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary' },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  // Compte une lecture après l'envoi de la page (ne ralentit pas l'affichage).
  after(() => incrementViews(article))

  const category = asCategory(article.category)
  const author = asAuthor(article.author)
  const cover = asMedia(article.cover)
  const coverSrc = imageUrl(cover, 'hero')

  const [related, latest] = await Promise.all([
    category
      ? getArticles({ categoryId: category.id, limit: 4, excludeIds: [article.id] })
      : Promise.resolve(null),
    getArticles({ limit: 10, excludeIds: [article.id] }),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ouragan.sn'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt || undefined,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt,
    image: coverSrc ? [new URL(coverSrc, siteUrl).toString()] : undefined,
    author: author ? [{ '@type': 'Person', name: author.name }] : undefined,
    publisher: { '@type': 'Organization', name: 'Ouragan.sn' },
  }

  return (
    <div className="container layout">
      <article className="layout__main article">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          {category && (
            <>
              <span aria-hidden="true">›</span>
              <Link href={`/rubrique/${category.slug}`}>{category.name}</Link>
            </>
          )}
        </nav>

        <header className="article__header">
          {article.kicker && <p className="article__kicker">{article.kicker}</p>}
          <h1>{article.title}</h1>
          {article.excerpt && <p className="article__excerpt">{article.excerpt}</p>}
          <p className="article__meta">
            {author && (
              <>
                Par <strong>{author.name}</strong>
                {author.role && <> · {author.role}</>}
                {' — '}
              </>
            )}
            <time dateTime={article.publishedAt || undefined}>
              {formatDateTime(article.publishedAt)}
            </time>
            {' · '}
            {formatViews((article.views || 0) + 1)}
          </p>
          <ShareBar url={`${siteUrl}/article/${article.slug}`} title={article.title} />
        </header>

        {coverSrc && (
          <figure className="article__cover">
            <div className="article__cover-img">
              <Image
                src={coverSrc}
                alt={cover?.alt || ''}
                fill
                sizes="(min-width: 1024px) 760px, 100vw"
                priority
              />
            </div>
            {(cover?.alt || cover?.credit) && (
              <figcaption>
                {cover?.alt}
                {cover?.credit && <span> © {cover.credit}</span>}
              </figcaption>
            )}
          </figure>
        )}

        {article.content && <RichText data={article.content} className="prose" />}

        {related && related.docs.length > 0 && (
          <section className="related">
            <h2>À lire aussi</h2>
            <div className="grid-cards">
              {related.docs.map((a) => (
                <ArticleCard key={a.id} article={a} variant="card" showCategory={false} />
              ))}
            </div>
          </section>
        )}
      </article>
      <aside className="layout__aside">
        <LatestList articles={latest.docs} />
      </aside>
    </div>
  )
}
