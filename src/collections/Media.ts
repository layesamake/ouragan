import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Média', plural: 'Médias' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: { group: 'Contenu' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif',
      type: 'text',
      required: true,
    },
    { name: 'credit', label: 'Crédit photo', type: 'text' },
  ],
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 200, position: 'centre' },
      { name: 'card', width: 640, height: 400, position: 'centre' },
      { name: 'hero', width: 1280, height: 720, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
}
