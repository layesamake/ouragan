/**
 * Transforme le lien d'une vidéo (YouTube, Facebook, TikTok, Vimeo, Dailymotion,
 * Instagram) en adresse de lecteur intégrable. Renvoie null si le lien n'est pas reconnu.
 */
export type VideoEmbed = {
  provider: 'youtube' | 'facebook' | 'tiktok' | 'vimeo' | 'dailymotion' | 'instagram'
  src: string
  /** Vidéo verticale (format téléphone) : TikTok, Shorts, Reels. */
  vertical: boolean
}

const parse = (raw: string): URL | null => {
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export function getVideoEmbed(raw?: string | null): VideoEmbed | null {
  if (!raw) return null
  const url = parse(raw)
  if (!url) return null
  const host = url.hostname.replace(/^(www\.|m\.|mobile\.)/, '')
  const parts = url.pathname.split('/').filter(Boolean)

  // YouTube : watch?v=, youtu.be/, shorts/, live/, embed/
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') {
    let id: string | null = null
    let vertical = false
    if (host === 'youtu.be') id = parts[0] ?? null
    else if (parts[0] === 'watch') id = url.searchParams.get('v')
    else if (['shorts', 'live', 'embed', 'v'].includes(parts[0] ?? '')) {
      id = parts[1] ?? null
      vertical = parts[0] === 'shorts'
    }
    if (!id || !/^[\w-]{6,}$/.test(id)) return null
    const start = Number.parseInt(
      url.searchParams.get('t') || url.searchParams.get('start') || '',
      10,
    )
    const query = Number.isFinite(start) && start > 0 ? `?start=${start}` : ''
    return {
      provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${id}${query}`,
      vertical,
    }
  }

  // Facebook : vidéos, watch, reels, fb.watch
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'web.facebook.com') {
    const isVideo =
      host === 'fb.watch' ||
      parts.includes('videos') ||
      parts[0] === 'watch' ||
      parts[0] === 'reel' ||
      parts[0] === 'share'
    if (!isVideo) return null
    return {
      provider: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?show_text=false&href=${encodeURIComponent(url.toString())}`,
      vertical: parts[0] === 'reel',
    }
  }

  // TikTok : tiktok.com/@compte/video/123
  if (host === 'tiktok.com') {
    const i = parts.indexOf('video')
    const id = i >= 0 ? parts[i + 1] : null
    if (!id || !/^\d+$/.test(id)) return null
    return { provider: 'tiktok', src: `https://www.tiktok.com/embed/v2/${id}`, vertical: true }
  }

  // Vimeo : vimeo.com/123456
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parts.find((p) => /^\d+$/.test(p))
    if (!id) return null
    return { provider: 'vimeo', src: `https://player.vimeo.com/video/${id}`, vertical: false }
  }

  // Dailymotion : dailymotion.com/video/x8abc, dai.ly/x8abc
  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const id = host === 'dai.ly' ? parts[0] : parts[0] === 'video' ? parts[1] : null
    if (!id) return null
    return {
      provider: 'dailymotion',
      src: `https://www.dailymotion.com/embed/video/${id.split('_')[0]}`,
      vertical: false,
    }
  }

  // Instagram : publications et reels
  if (host === 'instagram.com') {
    if (!['p', 'reel', 'reels', 'tv'].includes(parts[0] ?? '') || !parts[1]) return null
    const kind = parts[0] === 'reels' ? 'reel' : parts[0]
    return {
      provider: 'instagram',
      src: `https://www.instagram.com/${kind}/${parts[1]}/embed`,
      vertical: true,
    }
  }

  return null
}
