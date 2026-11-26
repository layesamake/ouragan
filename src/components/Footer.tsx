import Link from 'next/link'

import { getCategories } from '../lib/queries'

export async function Footer() {
  const categories = await getCategories()
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__brand">
            Ouragan<span>.sn</span>
          </p>
          <p>L&apos;info en live. Toute l&apos;actualité du Sénégal et d&apos;ailleurs.</p>
        </div>
        <ul className="site-footer__links">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/rubrique/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="container site-footer__copy">
        © {new Date().getFullYear()} Ouragan.sn — Tous droits réservés.
      </p>
    </footer>
  )
}
