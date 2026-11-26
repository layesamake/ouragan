import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { clearFeedCache } from '../lib/liveFeed'

async function revalidate(paths: string[], layout = false) {
  try {
    const { revalidatePath } = await import('next/cache')
    if (layout) revalidatePath('/', 'layout')
    else for (const p of paths) revalidatePath(p)
  } catch {
    // contexte hors Next.js (script)
  }
}

/** Changement du direct lui-même (titre, état…) : tout le site peut l'afficher (bandeau, menu). */
export const revalidateLiveAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  clearFeedCache(doc?.slug)
  await revalidate([], true)
  return doc
}

async function slugOf(live: unknown, req: PayloadRequest): Promise<string | null> {
  if (live && typeof live === 'object' && 'slug' in live) return (live as { slug: string }).slug
  if (live == null) return null
  const doc = await req.payload
    .findByID({ collection: 'lives', id: live as number, depth: 0, req })
    .catch(() => null)
  return doc?.slug ?? null
}

/**
 * Nouveau message : seules la page du direct et l'accueil (dernier message dans le
 * bandeau) sont régénérées, pas tout le site. Les lecteurs déjà sur la page le
 * reçoivent par le flux /direct/<slug>/flux.
 */
const onEntry = async (live: unknown, req: PayloadRequest) => {
  const slug = await slugOf(live, req)
  if (!slug) return
  clearFeedCache(slug)
  await revalidate([`/direct/${slug}`, '/', '/direct'])
}

export const revalidateEntryAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  await onEntry(doc?.live, req)
  return doc
}

export const revalidateEntryAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await onEntry(doc?.live, req)
  return doc
}
