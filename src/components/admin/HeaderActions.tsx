import Link from 'next/link'

/**
 * Raccourcis affichés dans la barre du haut de l'administration :
 * créer un article et ouvrir le site public dans un nouvel onglet.
 * Sur téléphone, seules les icônes restent visibles.
 */
export function HeaderActions() {
  return (
    <div className="ouragan-header-actions">
      <Link
        href="/admin/collections/articles/create"
        className="ouragan-header-action ouragan-header-action--primary"
        title="Nouvel article"
        aria-label="Nouvel article"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
        <span className="ouragan-header-action__label">Nouvel article</span>
      </Link>
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="ouragan-header-action"
        title="Voir le site (nouvel onglet)"
        aria-label="Voir le site (nouvel onglet)"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="ouragan-header-action__label">Voir le site</span>
      </a>
    </div>
  )
}
