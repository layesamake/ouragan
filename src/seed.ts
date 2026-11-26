/**
 * Crée les rubriques de base : pnpm seed
 * (elles sont aussi créées automatiquement au premier démarrage).
 */
import { getPayload } from 'payload'

import { ensureDefaultCategories } from './lib/defaultCategories'
import config from './payload.config'

const payload = await getPayload({ config })
await ensureDefaultCategories(payload)
process.exit(0)
