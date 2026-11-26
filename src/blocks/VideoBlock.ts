import type { Block } from 'payload'

import { getVideoEmbed } from '../lib/videoEmbed'

/** Vidéo intégrée dans le texte d'un article (YouTube, Facebook, TikTok…). */
export const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: 'Vidéo', plural: 'Vidéos' },
  imageAltText: 'Vidéo',
  fields: [
    {
      name: 'url',
      label: 'Lien de la vidéo',
      type: 'text',
      required: true,
      admin: {
        description:
          'Collez le lien YouTube, Facebook, TikTok, Instagram, Vimeo ou Dailymotion. Astuce : coller un lien directement dans le texte crée ce bloc tout seul.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && getVideoEmbed(value)
          ? true
          : 'Lien non reconnu : utilisez un lien YouTube, Facebook, TikTok, Instagram, Vimeo ou Dailymotion.',
    },
    { name: 'caption', label: 'Légende (facultatif)', type: 'text' },
  ],
}
