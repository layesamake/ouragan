import Link from 'next/link'

/** Lien « Statistiques » ajouté au menu de gauche de l'administration. */
export function StatsNavLink() {
  return (
    <Link href="/admin/statistiques" className="nav__link ouragan-nav-link">
      <span className="nav__link-label">📊 Statistiques</span>
    </Link>
  )
}
