import type { Payload } from 'payload'

/**
 * Rubriques du site. Les rubriques manquantes sont créées à chaque démarrage
 * (une rubrique renommée ou supprimée dans l'admin n'est recréée que si son nom n'existe plus).
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Politique', color: '#c1121f', order: 1 },
  { name: 'Économie', color: '#2a9d8f', order: 2 },
  { name: 'Société', color: '#27a3d9', order: 3 },
  { name: 'Culture', color: '#9d4edd', order: 4 },
  { name: 'Sports', color: '#2b9348', order: 5 },
  {
    name: 'Afrique',
    color: '#e76f51',
    order: 6,
    description: 'La une de l’actualité africaine.',
  },
  {
    name: 'International',
    color: '#1d3557',
    order: 7,
    description: 'La une de l’actualité internationale : Europe, États-Unis, Chine, Russie, Asie…',
  },
  { name: 'Vidéos', color: '#ec1a27', order: 8 },
]

/** Crée les rubriques manquantes (idempotent). */
export const ensureDefaultCategories = async (payload: Payload): Promise<void> => {
  let created = false
  for (const c of DEFAULT_CATEGORIES) {
    const existing = await payload.find({
      collection: 'categories',
      where: { name: { equals: c.name } },
      limit: 1,
      depth: 0,
    })
    if (existing.totalDocs) continue
    await payload.create({ collection: 'categories', data: c })
    payload.logger.info(`Rubrique créée : ${c.name}`)
    created = true
  }
  if (!created) return
  // « Vidéos » reste en dernier dans le menu si elle avait encore sa place d'origine (6).
  const videos = await payload.find({
    collection: 'categories',
    where: { and: [{ slug: { equals: 'videos' } }, { order: { equals: 6 } }] },
    limit: 1,
    depth: 0,
  })
  if (videos.docs[0]) {
    await payload.update({ collection: 'categories', id: videos.docs[0].id, data: { order: 8 } })
  }
}
