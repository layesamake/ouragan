import type { CollectionConfig } from 'payload'

/** Comptes qui se connectent à l'administration (le rédacteur). */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  admin: {
    useAsTitle: 'email',
    group: 'Réglages',
  },
  auth: true,
  fields: [{ name: 'name', label: 'Nom', type: 'text' }],
}
