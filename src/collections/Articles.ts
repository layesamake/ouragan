import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { VideoBlock } from '../blocks/VideoBlock'
import { PasteMediaFeature } from '../components/admin/editor/PasteMediaFeature'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { publicArticlesWhere } from '../lib/publicWhere'

import { slugField } from './slugField'

/** Adresse du site, pour l'aperçu en direct de l'article dans l'administration. */
const siteURL = () => process.env.NEXT_PUBLIC_SERVER_URL || ''

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    // Supprimer un article supprime aussi ses commentaires.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({
          collection: 'comments',
          where: { article: { equals: id } },
          overrideAccess: true,
          req,
        })
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status', 'featured'],
    group: 'Rédaction',
    listSearchableFields: ['title', 'excerpt'],
    preview: (doc) => (doc?.slug ? `${siteURL()}/article/${doc.slug}` : null),
    // Aperçu « téléphone » de l'article, à côté de l'éditeur, mis à jour à chaque sauvegarde auto.
    livePreview: {
      url: ({ data }) =>
        data?.slug ? `${siteURL()}/apercu?slug=${encodeURIComponent(data.slug)}` : null,
      breakpoints: [
        { label: 'Téléphone', name: 'mobile', width: 390, height: 780 },
        { label: 'Tablette', name: 'tablet', width: 820, height: 1100 },
        { label: 'Ordinateur', name: 'desktop', width: 1280, height: 860 },
      ],
    },
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
    // Le public ne voit que les articles publiés dont l'heure de publication est passée ;
    // le rédacteur connecté voit tout.
    read: ({ req }) => (req.user ? true : publicArticlesWhere()),
  },
  fields: [
    // ——— Zone principale : l'essentiel pour écrire ———
    {
      name: 'title',
      label: 'Titre',
      type: 'text',
      required: true,
      admin: { placeholder: 'Le titre de votre article' },
    },
    {
      name: 'excerpt',
      label: 'Chapô',
      type: 'textarea',
      admin: {
        placeholder: 'L’essentiel de l’information en 1 à 3 phrases…',
        description:
          'Mis en valeur sous le titre, et repris quand l’article est partagé sur les réseaux.',
        rows: 3,
      },
    },
    {
      name: 'cover',
      label: 'Photo principale',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Glissez-déposez une photo ici, ou cliquez pour en choisir une. Elle est compressée automatiquement.',
      },
    },
    {
      name: 'content',
      label: 'Texte de l’article',
      type: 'richText',
      admin: {
        description:
          'Astuce : collez un lien YouTube, Facebook, TikTok… pour intégrer la vidéo, ou collez une image (Ctrl+V) pour l’insérer directement.',
      },
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({ blocks: [VideoBlock] }),
          PasteMediaFeature(),
        ],
      }),
    },
    {
      type: 'collapsible',
      label: 'Surtitre (facultatif)',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'kicker',
          label: 'Surtitre',
          type: 'text',
          admin: {
            description: 'Petit mot au-dessus du titre (ex. : EXCLUSIF, VIDÉO, URGENT).',
          },
        },
      ],
    },

    // ——— Colonne de droite : réglages de publication ———
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
      name: 'featured',
      label: '⭐ À la une',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'En grand en haut de la page d’accueil.' },
    },
    {
      name: 'breaking',
      label: '⚡ Flash info',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Dans le bandeau défilant « En direct ».',
      },
    },
    {
      name: 'publishedAt',
      label: 'Date de publication',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Vide = publié tout de suite. Pour programmer : choisissez une date future puis cliquez sur « Publier » ; l’article apparaîtra tout seul à cette heure-là.',
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
      name: 'share',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/ShareButtons#ShareButtons' },
      },
    },
    {
      name: 'views',
      label: 'Lectures',
      type: 'number',
      defaultValue: 0,
      // Incrémenté automatiquement à chaque visite de l'article ; non modifiable dans l'admin.
      // Le compteur est affiché dans le bloc « Partager » (valeur réelle de l'article en ligne,
      // le formulaire montrant sinon celle du dernier brouillon enregistré).
      access: { create: () => false, update: () => false },
      admin: { position: 'sidebar', readOnly: true, hidden: true },
    },
    {
      name: 'commentsCount',
      label: 'Commentaires',
      type: 'number',
      defaultValue: 0,
      // Nombre de commentaires validés, tenu à jour par la collection Commentaires.
      access: { create: () => false, update: () => false },
      admin: { position: 'sidebar', readOnly: true, hidden: true },
    },
    {
      name: 'author',
      label: 'Auteur',
      type: 'relationship',
      relationTo: 'authors',
      admin: { position: 'sidebar' },
    },
    slugField('title'),
  ],
}
