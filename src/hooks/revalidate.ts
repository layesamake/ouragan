import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Les pages publiques sont mises en cache (ISR). Quand le rédacteur publie,
 * modifie ou supprime un contenu, on vide ce cache pour que le site soit à jour
 * immédiatement. Hors requête Next (script de seed…), revalidatePath n'existe
 * pas : l'erreur est ignorée.
 */
async function purgeSite() {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // contexte hors Next.js
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  // Les sauvegardes automatiques de brouillons ne changent rien au site public.
  const hasStatus = doc && '_status' in doc
  const touchesPublic =
    !hasStatus || doc._status === 'published' || previousDoc?._status === 'published'
  if (touchesPublic) await purgeSite()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await purgeSite()
  return doc
}
