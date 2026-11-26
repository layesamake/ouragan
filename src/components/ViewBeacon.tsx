'use client'

import { useEffect } from 'react'

/** Compte une lecture côté navigateur, pour que la page reste en cache. */
export function ViewBeacon({ id }: { id: number }) {
  useEffect(() => {
    const key = `ouragan:view:${id}`
    try {
      // Une seule lecture par article et par onglet.
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // stockage indisponible : on compte quand même
    }
    fetch(`/api/articles/${id}/view`, { method: 'POST', keepalive: true }).catch(() => {})
  }, [id])
  return null
}
