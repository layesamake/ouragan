import Link from 'next/link'

export function SectionTitle({
  title,
  href,
  color,
}: {
  title: string
  href?: string
  color?: string | null
}) {
  return (
    <div
      className="section-title"
      style={{ '--accent': color || undefined } as React.CSSProperties}
    >
      <h2>{href ? <Link href={href}>{title}</Link> : title}</h2>
      {href && (
        <Link href={href} className="section-title__more">
          Voir tout
        </Link>
      )}
    </div>
  )
}
