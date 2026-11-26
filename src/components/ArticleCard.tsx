import Image from 'next/image'
import Link from 'next/link'

import type { Article } from '../payload-types'
import { asCategory, asMedia, formatComments, formatViews, imageUrl, timeAgo } from '../lib/format'

type Variant = 'hero' | 'card' | 'row' | 'compact'

type Props = {
  article: Article
  variant?: Variant
  showCategory?: boolean
  /** false : pas de lectures, commentaires ni date sous le titre. */
  showMeta?: boolean
  priority?: boolean
}

const SIZES: Record<Variant, string> = {
  hero: '(min-width: 1024px) 760px, 100vw',
  card: '(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw',
  row: '140px',
  compact: '96px',
}

export function ArticleCard({
  article,
  variant = 'card',
  showCategory = true,
  showMeta = true,
  priority,
}: Props) {
  const category = asCategory(article.category)
  const media = asMedia(article.cover)
  const src = imageUrl(
    media,
    variant === 'hero' ? 'hero' : variant === 'card' ? 'card' : 'thumbnail',
  )
  const href = `/article/${article.slug}`
  const Title = variant === 'hero' ? 'h2' : 'h3'

  const big = variant === 'hero' || variant === 'card'
  const tag =
    showCategory && category ? (
      <Link
        href={`/rubrique/${category.slug}`}
        className={big && src ? 'tag tag--overlay' : 'tag'}
        style={{ '--tag': category.color || undefined } as React.CSSProperties}
      >
        {category.name}
      </Link>
    ) : null

  return (
    <article className={`card card--${variant}`}>
      {src && (
        <div className="card__media">
          <Link href={href} className="card__media-link" tabIndex={-1} aria-hidden="true">
            <Image
              src={src}
              alt={media?.alt || ''}
              fill
              sizes={SIZES[variant]}
              priority={priority}
            />
          </Link>
          {big && tag}
        </div>
      )}
      <div className="card__body">
        {!(big && src) && tag}
        <Title className="card__title">
          <Link href={href}>
            {article.kicker && <span className="kicker">{article.kicker} · </span>}
            {article.title}
          </Link>
        </Title>
        {variant === 'hero' && article.excerpt && (
          <p className="card__excerpt">{article.excerpt}</p>
        )}
        {showMeta && (
          <p className="card__meta">
            {big ? (
              <>
                <span>
                  {formatViews(article.views)} · {formatComments(article.commentsCount)}
                </span>
                <time dateTime={article.publishedAt || undefined}>
                  {timeAgo(article.publishedAt)}
                </time>
              </>
            ) : (
              <time dateTime={article.publishedAt || undefined}>
                {timeAgo(article.publishedAt)}
              </time>
            )}
          </p>
        )}
      </div>
    </article>
  )
}
