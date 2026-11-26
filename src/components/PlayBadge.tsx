/** Bouton « lecture » en filigrane, posé au centre de l'image des articles vidéo. */
export function PlayBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`play-badge play-badge--${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M8 5.5v13l10.5-6.5z" />
      </svg>
    </span>
  )
}
