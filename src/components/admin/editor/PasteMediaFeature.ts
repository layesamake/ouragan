import { createServerFeature } from '@payloadcms/richtext-lexical'

/**
 * Éditeur d'article : coller un lien vidéo crée un bloc « Vidéo », et coller une image
 * l'envoie dans la médiathèque puis l'insère dans le texte.
 */
export const PasteMediaFeature = createServerFeature({
  key: 'pasteMedia',
  feature: {
    ClientFeature: '/components/admin/editor/PasteMediaFeature.client#PasteMediaFeatureClient',
  },
})
