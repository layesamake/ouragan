import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

const WEBP = { format: 'webp', options: { quality: 78 } } as const

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Médiathèque' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    group: 'Rédaction',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'credit', 'createdAt'],
    listSearchableFields: ['alt', 'filename', 'credit'],
    description: 'Toutes vos photos. Utilisez la recherche pour en retrouver une.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Légende',
      type: 'text',
      required: true,
      admin: {
        description: 'Décrivez la photo en quelques mots (affiché sous l’image et lu par Google).',
      },
    },
    { name: 'credit', label: 'Crédit photo', type: 'text' },
  ],
  upload: {
    mimeTypes: ['image/*'],
    // Compression automatique : les photos du téléphone (souvent 4 à 8 Mo) sont réduites
    // à 1920 px de large et converties en WebP, beaucoup plus léger.
    resizeOptions: { width: 1920, withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 80 } },
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 200, position: 'centre', formatOptions: WEBP },
      { name: 'card', width: 640, height: 400, position: 'centre', formatOptions: WEBP },
      { name: 'hero', width: 1280, height: 720, position: 'centre', formatOptions: WEBP },
    ],
    adminThumbnail: 'thumbnail',
  },
}
