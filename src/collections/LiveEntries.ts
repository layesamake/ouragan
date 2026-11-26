import type { CollectionConfig } from 'payload'

import { revalidateEntryAfterChange, revalidateEntryAfterDelete } from '../hooks/revalidateLive'

/**
 * Messages d'un direct. Ils se gèrent depuis la page du direct (bloc « Publier
 * dans le direct »), d'où la collection masquée du menu.
 */
export const LiveEntries: CollectionConfig = {
  slug: 'live-entries',
  labels: { singular: 'Message du direct', plural: 'Messages du direct' },
  hooks: {
    afterChange: [revalidateEntryAfterChange],
    afterDelete: [revalidateEntryAfterDelete],
  },
  admin: {
    hidden: true,
    useAsTitle: 'text',
    defaultColumns: ['text', 'live', 'createdAt'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => (req.user ? true : { 'live.status': { not_equals: 'draft' } }),
  },
  fields: [
    {
      name: 'live',
      label: 'Direct',
      type: 'relationship',
      relationTo: 'lives',
      required: true,
      index: true,
    },
    { name: 'title', label: 'Titre (facultatif)', type: 'text' },
    { name: 'text', label: 'Message', type: 'textarea', required: true },
    {
      name: 'important',
      label: '⚡ Moment clé',
      type: 'checkbox',
      defaultValue: false,
    },
    { name: 'image', label: 'Photo', type: 'upload', relationTo: 'media' },
    {
      name: 'article',
      label: 'Article lié',
      type: 'relationship',
      relationTo: 'articles',
    },
  ],
}
