import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LatestList } from '../../../../components/LatestList'
import { LiveFeed } from '../../../../components/LiveFeed'
import { ShareBar } from '../../../../components/ShareBar'
import { asCategory, asMedia, formatDateTime, imageUrl } from '../../../../lib/format'
import { FEED_LIMIT, findLiveBySlug, getLiveEntries } from '../../../../lib/liveFeed'
import { getArticles, getClient } from '../../../../lib/queries'

// Page en cache (ISR), régénérée à chaque nouveau message. Les lecteurs déjà présents
// reçoivent les nouveaux messages par le flux (composant LiveFeed), sans recharger.
export const revalidate = 60

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

const load = async (slug: string) => findLiveBySlug(await getClient(), slug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const live = await load(slug)
  if (!live) return {}
  const cover = imageUrl(asMedia(live.cover), 'hero')
  const title = live.status === 'live' ? `🔴 EN DIRECT — ${live.title}` : live.title
  return {
    title,
    description: live.summary || undefined,
    alternates: { canonical: `/direct/${live.slug}` },
    openGraph: {
      type: 'article',
      title,
      description: live.summary || undefined,
      images: cover ? [cover] : ['/logo-ouragan.png'],
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary' },
  }
}

export default async function LivePage({ params }: Props) {
  const { slug } = await params
  const payload = await getClient()
  const live = await findLiveBySlug(payload, slug)
  if (!live) notFound()

  const [{ entries, total }, latest] = await Promise.all([
    getLiveEntries(payload, live.id),
    getArticles({ limit: 8 }),
  ])
  const category = asCategory(live.category)
  const cover = asMedia(live.cover)
  const coverSrc = imageUrl(cover, 'hero')
  const isLive = live.status === 'live'
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ouragan.sn'
  const url = `${siteUrl}/direct/${live.slug}`

  // Données structurées « LiveBlogPosting » : Google peut afficher le badge « En direct ».
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LiveBlogPosting',
    headline: live.title,
    description: live.summary || undefined,
    url,
    coverageStartTime: live.startedAt || live.createdAt,
    coverageEndTime: live.endedAt || undefined,
    datePublished: live.startedAt || live.createdAt,
    dateModified: entries[0]?.createdAt || live.updatedAt,
    image: coverSrc ? [new URL(coverSrc, siteUrl).toString()] : undefined,
    publisher: { '@type': 'Organization', name: 'Ouragan.sn' },
    liveBlogUpdate: entries.slice(0, 10).map((e) => ({
      '@type': 'BlogPosting',
      headline: (e.title || e.text).slice(0, 110),
      articleBody: e.text,
      datePublished: e.createdAt,
      url: `${url}#m${e.id}`,
    })),
  }

  return (
    <div className="container layout">
      <article className="layout__main article live">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">›</span>
          <Link href="/direct">Directs</Link>
          {category && (
            <>
              <span aria-hidden="true">›</span>
              <Link href={`/rubrique/${category.slug}`}>{category.name}</Link>
            </>
          )}
        </nav>

        <header className="article__header">
          <p className={`live__badge${isLive ? '' : ' live__badge--ended'}`}>
            {isLive ? (
              <>
                <span className="dot dot--white" aria-hidden="true" /> En direct
              </>
            ) : (
              'Direct terminé'
            )}
          </p>
          <h1>{live.title}</h1>
          {live.summary && <p className="article__excerpt">{live.summary}</p>}
          {live.startedAt && (
            <p className="article__meta">
              Commencé le <time dateTime={live.startedAt}>{formatDateTime(live.startedAt)}</time>
              {live.endedAt && (
                <>
                  {' · terminé le '}
                  <time dateTime={live.endedAt}>{formatDateTime(live.endedAt)}</time>
                </>
              )}
            </p>
          )}
          <ShareBar url={url} title={live.title} />
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
                fetchPriority="high"
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

        <LiveFeed
          key={live.id}
          slug={live.slug || slug}
          initial={{ id: live.id, status: live.status, title: live.title, entries }}
          hasMore={total > FEED_LIMIT}
        />
      </article>
      <aside className="layout__aside">
        <LatestList articles={latest.docs} />
      </aside>
    </div>
  )
}
