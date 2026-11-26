import { getVideoEmbed } from '../lib/videoEmbed'

/** Lecteur vidéo intégré dans un article (YouTube, Facebook, TikTok…). */
export function VideoEmbed({ url, caption }: { url: string; caption?: string | null }) {
  const embed = getVideoEmbed(url)
  if (!embed) return null
  return (
    <figure
      className={`video-embed video-embed--${embed.provider}${embed.vertical ? ' video-embed--vertical' : ''}`}
    >
      <div className="video-embed__frame">
        <iframe
          src={embed.src}
          title={caption || 'Vidéo'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
