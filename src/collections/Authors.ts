import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { slugField } from './slugField'

export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: { singular: 'Auteur', plural: 'Auteurs' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    useAsTitle: 'name',
    group: 'Contenu',
  },
  access: { read: () => true },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    slugField('name'),
    {
      name: 'role',
      label: 'Fonction',
      type: 'text',
      admin: { description: 'Ex. : Journaliste, Correspondant à Thiès' },
    },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'bio', label: 'Biographie', type: 'textarea' },
  ],
}
