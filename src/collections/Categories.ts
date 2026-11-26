import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { slugField } from './slugField'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Rubrique', plural: 'Rubriques' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'showInNav', 'showOnHome'],
    group: 'Contenu',
  },
  defaultSort: 'order',
  access: { read: () => true },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    slugField('name'),
    { name: 'description', label: 'Description', type: 'textarea' },
    {
      name: 'color',
      label: 'Couleur',
      type: 'text',
      defaultValue: '#27a3d9',
      admin: { description: 'Couleur hexadécimale de la rubrique (ex. #e63946).' },
    },
    {
      name: 'order',
      label: "Ordre d'affichage",
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'showInNav',
      label: 'Afficher dans le menu',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'showOnHome',
      label: "Bloc sur la page d'accueil",
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
