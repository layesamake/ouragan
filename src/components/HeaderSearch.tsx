'use client'

import { useEffect, useRef, useState } from 'react'

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.8 4.8-1.4 1.4-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
  </svg>
)

/**
 * Recherche de l'en-tête, juste après la date.
 * Ordinateur : champ toujours visible. Mobile : une loupe qui déplie le champ sous la barre.
 * Formulaire GET classique vers /recherche : fonctionne aussi sans JavaScript.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <>
      <button
        type="button"
        className="hsearch__toggle"
        aria-label={open ? 'Fermer la recherche' : 'Rechercher'}
        aria-expanded={open}
        aria-controls="recherche-entete"
        onClick={() => setOpen((v) => !v)}
      >
        <SearchIcon />
      </button>
      <form
        id="recherche-entete"
        role="search"
        action="/recherche"
        method="get"
        className={`hsearch${open ? ' hsearch--open' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <label htmlFor="recherche-entete-q" className="sr-only">
          Rechercher un article
        </label>
        <input
          ref={inputRef}
          id="recherche-entete-q"
          name="q"
          type="search"
          placeholder="Rechercher un article…"
          autoComplete="off"
          enterKeyHint="search"
          minLength={2}
          maxLength={100}
          required
        />
        <button type="submit" aria-label="Lancer la recherche">
          <SearchIcon />
        </button>
      </form>
    </>
  )
}
