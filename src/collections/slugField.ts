import type { Field } from 'payload'

import { slugify } from '../lib/slugify'

/** Champ slug rempli automatiquement à partir d'un autre champ (modifiable). */
export const slugField = (from: string): Field => ({
  name: 'slug',
  label: 'Adresse (slug)',
  type: 'text',
  index: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description: 'Généré automatiquement si laissé vide.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const source = data?.[from]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})
