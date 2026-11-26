import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
} from 'payload'

import { revalidateAfterDelete } from '../hooks/revalidate'
import { revalidateLiveAfterChange } from '../hooks/revalidateLive'

import { slugField } from './slugField'

/** Note l'heure de début (passage « En cours ») et de fin (passage « Terminé »). */
const stampTimes: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const now = new Date().toISOString()
  if (data.status === 'live' && !data.startedAt && !originalDoc?.startedAt) data.startedAt = now
  if (data.status === 'ended' && originalDoc?.status !== 'ended') data.endedAt = now
  if (data.status === 'live') data.endedAt = null
  return data
}

/** Supprimer un direct supprime aussi ses messages. */
const deleteEntries: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({ collection: 'live-entries', where: { live: { equals: id } }, req })
}

/**
 * Directs (« live ») pour les grands événements : élections, matchs, Magal,
 * conseil des ministres… Les messages courts sont dans la collection `live-entries`
 * et s'ajoutent depuis le formulaire du direct (bloc « Publier dans le direct »).
 */
export const Lives: CollectionConfig = {
  slug: 'lives',
  typescript: { interface: 'Live' },
  labels: { singular: 'Direct', plural: 'Directs' },
  hooks: {
    beforeChange: [stampTimes],
    beforeDelete: [deleteEntries],
    afterChange: [revalidateLiveAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'startedAt', 'updatedAt'],
    group: 'Rédaction',
    description:
      'Suivez un grand événement en direct : vos messages apparaissent sur le site sans que les lecteurs aient à recharger la page.',
    preview: (doc) =>
      doc?.slug ? `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/direct/${doc.slug}` : null,
  },
  defaultSort: '-updatedAt',
  access: {
    // Le public voit les directs en cours et terminés, pas ceux en préparation.
    read: ({ req }) => (req.user ? true : { status: { not_equals: 'draft' } }),
  },
  fields: [
    {
      name: 'title',
      label: 'Titre du direct',
      type: 'text',
      required: true,
      admin: { placeholder: 'Ex. : Présidentielle 2029 : suivez les résultats en direct' },
    },
    {
      name: 'composer',
      type: 'ui',
      admin: { components: { Field: '/components/admin/LiveComposer#LiveComposer' } },
    },
    {
      type: 'collapsible',
      label: 'Présentation et photo (facultatif)',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'summary',
          label: 'Présentation',
          type: 'textarea',
          admin: {
            description: '1 ou 2 phrases affichées en haut du direct et lors du partage.',
          },
        },
        { name: 'cover', label: 'Photo', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'status',
      label: 'État',
      type: 'select',
      required: true,
      defaultValue: 'live',
      index: true,
      options: [
        { label: '🔴 En cours', value: 'live' },
        { label: '⏸ En préparation (invisible)', value: 'draft' },
        { label: '✅ Terminé', value: 'ended' },
      ],
      admin: {
        position: 'sidebar',
        description:
          '« En cours » : affiché en haut de la page d’accueil. « Terminé » : la page reste consultable.',
      },
    },
    {
      name: 'category',
      label: 'Rubrique',
      type: 'relationship',
      relationTo: 'categories',
      admin: { position: 'sidebar' },
    },
    {
      name: 'startedAt',
      label: 'Début',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'endedAt',
      label: 'Fin',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => data?.status === 'ended',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    slugField('title'),
  ],
}
