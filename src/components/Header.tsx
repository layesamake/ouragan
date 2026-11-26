import Image from 'next/image'
import Link from 'next/link'

import { getActiveLives, getCategories } from '../lib/queries'
import { todayLabel } from '../lib/format'
import { MainNav } from './MainNav'
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
              sizes="(min-width: 640px) 166px, 120px"
              priority
            />
          </Link>
        </div>
      </div>
      <MainNav
        items={[
          { href: '/', label: 'Accueil' },
          ...(lives.length > 0
            ? [
                {
                  href: lives.length === 1 ? `/direct/${lives[0].slug}` : '/direct',
                  label: 'Direct',
                  live: true,
                },
              ]
            : []),
          ...categories.map((c) => ({ href: `/rubrique/${c.slug}`, label: c.name })),
        ]}
      />
    </header>
  )
}
