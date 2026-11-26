export function ShareBar({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, cls: 'wa' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: 'fb' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, cls: 'x' },
  ]
  return (
    <div className="share" aria-label="Partager l'article">
      <span>Partager :</span>
      {links.map((l) => (
        <a
          key={l.cls}
          href={l.href}
          className={`share__btn share__btn--${l.cls}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}
