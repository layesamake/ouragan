import { getSocialLinks, type SocialNetwork } from '../lib/queries'

const ICONS: Record<SocialNetwork, { label: string; path: string }> = {
  facebook: {
    label: 'Facebook',
    path: 'M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z',
  },
  youtube: {
    label: 'YouTube',
    path: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z',
  },
  instagram: {
    label: 'Instagram',
    path: 'M12 7.4A4.6 4.6 0 1 0 16.6 12 4.6 4.6 0 0 0 12 7.4zm0 7.6a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm5.9-7.8a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1zM21 8.3c-.1-1.4-.4-2.7-1.5-3.8S17.1 3.1 15.7 3c-1.5-.1-5.9-.1-7.4 0-1.4.1-2.7.4-3.8 1.5S3.1 6.9 3 8.3c-.1 1.5-.1 5.9 0 7.4.1 1.4.4 2.7 1.5 3.8s2.4 1.4 3.8 1.5c1.5.1 5.9.1 7.4 0 1.4-.1 2.7-.4 3.8-1.5s1.4-2.4 1.5-3.8c.1-1.5.1-5.9 0-7.4zm-2 9.4a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.3.4s-4.1.1-5.3-.4a3 3 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.3s-.1-4.1.4-5.3A3 3 0 0 1 6.7 4.6c1.2-.5 4-.4 5.3-.4s4.1-.1 5.3.4a3 3 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.3s.1 4.1-.4 5.3z',
  },
  x: {
    label: 'X',
    path: 'M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.3l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z',
  },
  tiktok: {
    label: 'TikTok',
    path: 'M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.8a5.7 5.7 0 1 0 4.9 5.6V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z',
  },
}

/** Icônes des réseaux sociaux d'Ouragan (liens réglables dans l'admin). */
export async function SocialLinks({ variant }: { variant: 'topbar' | 'footer' }) {
  const links = await getSocialLinks()
  if (links.length === 0) return null
  return (
    <ul className={`social social--${variant}`} aria-label="Suivez Ouragan.sn">
      {links.map(({ network, url }) => (
        <li key={network}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`social__link social__link--${network}`}
            aria-label={`Ouragan.sn sur ${ICONS[network].label}`}
            title={ICONS[network].label}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d={ICONS[network].path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
