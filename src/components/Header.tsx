import Image from 'next/image'
import Link from 'next/link'

import { getActiveLives, getCategories } from '../lib/queries'
import { todayLabel } from '../lib/format'
import { SocialLinks } from './SocialLinks'

export async function Header() {
  const [allCategories, lives] = await Promise.all([getCategories(), getActiveLives()])
  const categories = allCategories.filter((c) => c.showInNav !== false)

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar__inner">
          <span className="topbar__date">{todayLabel()}</span>
          <div className="topbar__right">
            <SocialLinks variant="topbar" />
            <span className="topbar__live">
              <span className="dot" aria-hidden="true" /> L&apos;info en live
            </span>
          </div>
        </div>
      </div>
      <div className="brandbar">
        <div className="container brandbar__inner">
          <Link href="/" className="brand" aria-label="Ouragan.sn — accueil">
            <Image
              src="/logo-ouragan.png"
              alt="Ouragan.sn — L'info en live"
              width={480}
              height={208}
              priority
            />
          </Link>
        </div>
      </div>
      <nav className="rubriques" aria-label="Rubriques">
        <ul className="container rubriques__list">
          <li>
            <Link href="/">Accueil</Link>
          </li>
          {lives.length > 0 && (
            <li>
              <Link
                href={lives.length === 1 ? `/direct/${lives[0].slug}` : '/direct'}
                className="rubriques__live"
              >
                <span className="dot dot--white" aria-hidden="true" /> Direct
              </Link>
            </li>
          )}
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/rubrique/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
