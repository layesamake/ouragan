'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** Recharge l'aperçu de l'article à chaque sauvegarde (auto) dans l'administration. */
export function LivePreviewRefresh() {
  const router = useRouter()
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  )
  if (!origin) return null
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} />
}
