import type { GlobalConfig } from 'payload'

/** Liens par défaut, utilisés tant que le réglage n'a jamais été enregistré dans l'admin. */
export const DEFAULT_SOCIAL_LINKS = {
  youtube: 'https://www.youtube.com/@ouragan_sn',
  facebook: 'https://www.facebook.com/share/19vupAgc72/',
}

const httpsUrl = (value: unknown) => {
  if (!value) return true
  try {
    return new URL(String(value)).protocol === 'https:' || 'Le lien doit commencer par https://'
  } catch {
    return 'Lien invalide.'
  }
}

const link = (name: string, label: string, placeholder: string) => ({
  name,
  label,
  type: 'text' as const,
  validate: httpsUrl,
  defaultValue: DEFAULT_SOCIAL_LINKS[name as keyof typeof DEFAULT_SOCIAL_LINKS],
  admin: { placeholder },
})

export const SocialLinks: GlobalConfig = {
  slug: 'social-links',
  label: 'Réseaux sociaux',
  admin: {
    group: 'Réglages',
    description: 'Liens affichés en haut et en bas du site. Laissez vide pour masquer un réseau.',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/', 'layout')
        } catch {
          // hors Next.js
        }
        return doc
      },
    ],
  },
  fields: [
    link('youtube', 'YouTube', 'https://www.youtube.com/@…'),
    link('facebook', 'Facebook', 'https://www.facebook.com/…'),
    link('instagram', 'Instagram', 'https://www.instagram.com/…'),
    link('x', 'X (Twitter)', 'https://x.com/…'),
    link('tiktok', 'TikTok', 'https://www.tiktok.com/@…'),
  ],
}
