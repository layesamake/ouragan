import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { pasteImageFromURL } from '../lib/fetchRemoteImage'
import { slugify } from '../lib/slugify'

/**
 * Nom de fichier sûr pour le stockage Supabase, qui refuse certains caractères
 * (ex. « photo.jpeg[1].png » téléchargé deux fois sous Windows, # ? % etc.).
 * « Ngalla Sylla (1).JPEG » devient « ngalla-sylla-1.jpeg ».
 */
export const safeUploadName = (name: string): string => {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : ''
  const cleanBase = slugify(base) || `photo-${Date.now()}`
  return ext ? `${cleanBase}.${ext}` : cleanBase
}

const WEBP = { format: 'webp', options: { quality: 78 } } as const

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Médiathèque' },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req.file?.name) {
          req.file.name = safeUploadName(req.file.name)
        }
      },
    ],
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
  // Remplace l'endpoint « coller une URL » de Payload (voir lib/fetchRemoteImage.ts).
  endpoints: [
    { path: '/paste-url', method: 'get', handler: pasteImageFromURL },
    { path: '/paste-url/:id', method: 'get', handler: pasteImageFromURL },
  ],
  fields: [
    {
      name: 'alt',
      label: 'Légende',
      type: 'text',
      // Facultative : une image collée dans un article est enregistrée tout de suite,
      // la légende peut être ajoutée ensuite depuis la médiathèque.
      admin: {
        description:
          'Conseillé : décrivez la photo en quelques mots (affiché sous l’image et lu par Google).',
      },
    },
    { name: 'credit', label: 'Crédit photo', type: 'text' },
  ],
  upload: {
    mimeTypes: ['image/*'],
    // Une liste non vide fait passer le bouton « Ajouter un fichier » (depuis un lien) par le
    // serveur quand le navigateur ne peut pas télécharger l'image (cas le plus courant).
    // Le téléchargement est fait par notre endpoint /paste-url ci-dessus, pour tous les sites.
    pasteURL: { allowList: [{ hostname: 'ouragan.sn', protocol: 'https' }] },
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
