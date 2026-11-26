import type { Payload } from 'payload'

/** Rubriques du site, créées automatiquement si la base n'en contient aucune. */
export const DEFAULT_CATEGORIES = [
  { name: 'Politique', color: '#c1121f' },
  { name: 'Économie', color: '#2a9d8f' },
  { name: 'Société', color: '#27a3d9' },
  { name: 'Culture', color: '#9d4edd' },
  { name: 'Sports', color: '#2b9348' },
  { name: 'Vidéos', color: '#ec1a27' },
]

/** Crée les rubriques manquantes (idempotent). */
export const ensureDefaultCategories = async (payload: Payload): Promise<void> => {
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    const existing = await payload.find({
      collection: 'categories',
      where: { name: { equals: c.name } },
      limit: 1,
      depth: 0,
    })
    if (existing.totalDocs) continue
    await payload.create({ collection: 'categories', data: { ...c, order: i + 1 } })
    payload.logger.info(`Rubrique créée : ${c.name}`)
  }
}
