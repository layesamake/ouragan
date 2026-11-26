import Image from 'next/image'
import Link from 'next/link'

import type { Article } from '../payload-types'
import { asCategory, asMedia, imageUrl, timeAgo } from '../lib/format'

type Variant = 'hero' | 'card' | 'row' | 'compact'

type Props = {
  article: Article
  variant?: Variant
  showCategory?: boolean
  priority?: boolean
}

const SIZES: Record<Variant, string> = {
  hero: '(min-width: 1024px) 760px, 100vw',
  card: '(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw',
  row: '140px',
  compact: '96px',
}

export function ArticleCard({ article, variant = 'card', showCategory = true, priority }: Props) {
  const category = asCategory(article.category)
  const media = asMedia(article.cover)
  const src = imageUrl(
    media,
    variant === 'hero' ? 'hero' : variant === 'card' ? 'card' : 'thumbnail',
  )
  const href = `/article/${article.slug}`
  const Title = variant === 'hero' ? 'h2' : 'h3'

  return (
    <article className={`card card--${variant}`}>
      {src && (
        <Link href={href} className="card__media" tabIndex={-1} aria-hidden="true">
          <Image src={src} alt={media?.alt || ''} fill sizes={SIZES[variant]} priority={priority} />
        </Link>
      )}
      <div className="card__body">
        {showCategory && category && (
          <Link
            href={`/rubrique/${category.slug}`}
            className="tag"
            style={{ '--tag': category.color || undefined } as React.CSSProperties}
          >
            {category.name}
          </Link>
        )}
        <Title className="card__title">
          <Link href={href}>
            {article.kicker && <span className="kicker">{article.kicker} · </span>}
            {article.title}
          </Link>
        </Title>
        {(variant === 'hero' || variant === 'card') && article.excerpt && (
          <p className="card__excerpt">{article.excerpt}</p>
        )}
        <time className="card__time" dateTime={article.publishedAt || undefined}>
          {timeAgo(article.publishedAt)}
        </time>
      </div>
    </article>
  )
}
