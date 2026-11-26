import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

const httpsUrl = (value: unknown) => {
  if (!value) return true
  try {
    const u = new URL(String(value))
    return u.protocol === 'https:' || 'Le lien doit commencer par https:// (sinon les navigateurs le bloquent).'
  } catch {
    return 'Lien invalide.'
  }
}

export const Radios: CollectionConfig = {
  slug: 'radios',
  labels: { singular: 'Radio', plural: 'Radios' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'active', 'streamUrl'],
    group: 'Contenu',
    description: 'Radios proposées en écoute dans le bloc « Ouragan Radios » de la page d’accueil.',
  },
  defaultSort: 'order',
  access: { read: () => true },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
    {
      name: 'streamUrl',
      label: 'Flux audio en direct',
      type: 'text',
      validate: httpsUrl,
      admin: {
        description:
          'Adresse du flux (MP3/AAC/HLS) fournie par la radio, en https. Il est lu directement sur le site.',
      },
    },
    {
      name: 'liveUrl',
      label: 'Page du direct (si pas de flux)',
      type: 'text',
      validate: httpsUrl,
      admin: {
        description: 'Utilisée seulement si aucun flux n’est renseigné : le bouton ouvre cette page.',
      },
    },
    {
      name: 'order',
      label: 'Ordre',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      label: 'Afficher sur le site',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
