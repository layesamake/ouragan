/**
 * Crée les rubriques de base (à lancer une fois) : pnpm seed
 */
import { getPayload } from 'payload'

import config from './payload.config'

const RUBRIQUES = [
  { name: 'Politique', color: '#c1121f' },
  { name: 'Société', color: '#27a3d9' },
  { name: 'Économie', color: '#2a9d8f' },
  { name: 'Sport', color: '#2b9348' },
  { name: 'International', color: '#3a5a9b' },
  { name: 'Culture', color: '#9d4edd' },
  { name: 'People', color: '#e5383b' },
  { name: 'Faits divers', color: '#6c757d' },
  { name: 'Santé', color: '#0096c7' },
  { name: 'Tech', color: '#f77f00' },
]

const seed = async () => {
  const payload = await getPayload({ config })

  for (const [i, r] of RUBRIQUES.entries()) {
    const exists = await payload.find({
      collection: 'categories',
      where: { name: { equals: r.name } },
      limit: 1,
    })
    if (exists.totalDocs) continue
    await payload.create({ collection: 'categories', data: { ...r, order: i + 1 } })
    payload.logger.info(`Rubrique créée : ${r.name}`)
  }

  process.exit(0)
}

await seed()
