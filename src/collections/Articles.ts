import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { slugField } from './slugField'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status', 'featured'],
    group: 'Contenu',
    listSearchableFields: ['title', 'excerpt'],
    preview: (doc) => (doc?.slug ? `/article/${doc.slug}` : null),
  },
  defaultSort: '-publishedAt',
  endpoints: [
    {
      // POST /api/articles/:id/view — appelé par le navigateur à l'ouverture d'un article.
      path: '/:id/view',
      method: 'post',
      handler: async (req) => {
        const id = Number(req.routeParams?.id)
        if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 })
        const doc = await req.payload.db.findOne<{ id: number; views?: number | null }>({
          collection: 'articles',
          where: { and: [{ id: { equals: id } }, { _status: { equals: 'published' } }] },
          req,
        })
        if (!doc) return Response.json({ ok: false }, { status: 404 })
        // Écriture directe en base : ni hooks, ni nouvelle version, ni vidage du cache.
        await req.payload.db.updateOne({
          collection: 'articles',
          id,
          data: { views: (doc.views || 0) + 1 },
          returning: false,
          req,
        })
        return Response.json({ ok: true })
      },
    },
  ],
  versions: {
    drafts: { autosave: { interval: 2000 } },
    maxPerDoc: 20,
  },
  access: {
    // Le public ne voit que les articles publiés ; le rédacteur connecté voit tout.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    {
      name: 'kicker',
      label: 'Surtitre',
      type: 'text',
      admin: { description: 'Petit texte au-dessus du titre (ex. : EXCLUSIF, VIDÉO, URGENT).' },
    },
    {
      name: 'excerpt',
      label: 'Chapô',
      type: 'textarea',
      admin: { description: 'Résumé de 1 à 3 phrases, affiché sous le titre et dans les listes.' },
    },
    { name: 'cover', label: 'Image principale', type: 'upload', relationTo: 'media' },
    { name: 'content', label: 'Contenu', type: 'richText' },
    slugField('title'),
    {
      name: 'category',
      label: 'Rubrique',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      label: 'Auteur',
      type: 'relationship',
      relationTo: 'authors',
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      label: 'Date de publication',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
      hooks: {
        beforeChange: [
          ({ value, siblingData }) => {
            if (!value && siblingData?._status === 'published') return new Date().toISOString()
            return value
          },
        ],
      },
    },
    {
      name: 'views',
      label: 'Lectures',
      type: 'number',
      defaultValue: 0,
      // Incrémenté automatiquement à chaque visite de l'article ; non modifiable dans l'admin.
      access: { create: () => false, update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'featured',
      label: 'À la une',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: "Mettre en avant en haut de la page d'accueil." },
    },
    {
      name: 'breaking',
      label: 'Flash info',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Afficher dans le bandeau défilant « En direct ».',
      },
    },
  ],
}
