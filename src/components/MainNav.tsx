'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Item = { href: string; label: string; live?: boolean }

/**
 * Menu des rubriques.
 * Mobile/tablette : bouton « menu » (trois traits) qui ouvre un panneau avec toutes les rubriques.
 * Ordinateur (≥ 1024 px) : liste horizontale, comme avant.
 */
export function MainNav({ items }: { items: Item[] }) {
  const pathname = usePathname()
  // Le panneau est ouvert « pour » une page : il se referme tout seul quand on en change.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((prev) => {
      const next = typeof value === 'function' ? value(prev === pathname) : value
      return next ? pathname : null
    })

  // Échap ferme le panneau
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
  const live = items.find((i) => i.live)
  const current = items.find((i) => !i.live && i.href !== '/' && isCurrent(i.href))

  return (
    <nav className={`rubriques${open ? ' is-open' : ''}`} aria-label="Rubriques">
      <div className="container rubriques__bar">
        <button
          type="button"
          className="rubriques__toggle"
          aria-expanded={open}
          aria-controls="menu-rubriques"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="burger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {open ? 'Fermer' : current ? current.label : 'Rubriques'}
        </button>
        {live && (
          <Link href={live.href} className="rubriques__live rubriques__live--bar">
            <span className="dot dot--white" aria-hidden="true" /> {live.label}
          </Link>
        )}
        <ul id="menu-rubriques" className="rubriques__list">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className={i.live ? 'rubriques__live' : undefined}
                aria-current={isCurrent(i.href) ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {i.live && <span className="dot dot--white" aria-hidden="true" />} {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {open && (
        <button
          type="button"
          className="rubriques__backdrop"
          aria-label="Fermer le menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
    </nav>
  )
}
