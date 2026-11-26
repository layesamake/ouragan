import { extractFromHtml } from '@extractus/article-extractor'
import * as cheerio from 'cheerio'
import Parser from 'rss-parser'

import { HTTP_HEADERS, HTTP_TIMEOUT_MS, normalizeUrl, type NewsSource } from './newsSources'
import { getVideoEmbed } from './videoEmbed'

/** Article repéré dans le flux (ou sur la page d'accueil) d'un média. */
export type SourceItem = {
  source: NewsSource
  url: string
  title: string
  categories: string[]
  /** Corps complet fourni par le flux (<content:encoded>), en HTML. */
  contentHtml?: string
  /** Photo de l'article annoncée par le flux (enclosure, media:content). */
  imageUrl?: string
}

/** Au-delà, le texte fourni par le flux suffit : pas besoin d'ouvrir la page. */
export const RSS_CONTENT_MIN_CHARS = 400
/** En dessous, l'article est trop court pour être réécrit. */
export const MIN_TEXT_CHARS = 350

async function fetchText(url: string, timeoutMs = HTTP_TIMEOUT_MS): Promise<string> {
  const res = await fetch(url, {
    headers: HTTP_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`)
  return res.text()
}

type MediaTag = { $?: { url?: string; medium?: string; type?: string } }
type FeedItem = {
  'content:encoded'?: string
  categories?: (string | { _: string })[]
  mediaContent?: MediaTag
  mediaThumbnail?: MediaTag
}
const parser: Parser<object, FeedItem> = new Parser({
  customFields: {
    item: [
      'content:encoded',
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
})

/** Écarte logos, icônes, avatars et pixels de suivi. */
const isPlausiblePhoto = (url: string | undefined | null): url is string =>
  Boolean(url) &&
  /^https?:\/\//i.test(url!) &&
  !/\.(svg|gif|ico)(\?|$)/i.test(url!) &&
  !/(logo|avatar|icon|favicon|placeholder|default[-_]|gravatar|pixel|sprite|banner-pub|\/pub\/)/i.test(
    url!,
  )

/** Adresse absolue d'une image, ou undefined si elle ne ressemble pas à une photo. */
const photoUrl = (raw: string | undefined | null, base: string): string | undefined => {
  if (!raw) return undefined
  try {
    const abs = new URL(raw.trim(), base).toString()
    return isPlausiblePhoto(abs) ? abs : undefined
  } catch {
    return undefined
  }
}

/** Première image d'un fragment HTML. */
const firstImage = (html: string, base: string): string | undefined => {
  const $ = cheerio.load(html)
  for (const img of $('img').toArray()) {
    const src = $(img).attr('data-src') || $(img).attr('src')
    const url = photoUrl(src, base)
    if (url) return url
  }
  return undefined
}

/** Vidéos intégrées au plus par article. */
const MAX_VIDEOS = 2

/** Lien « normal » d'une vidéo à partir de l'adresse de son lecteur intégré. */
function videoFromEmbed(raw: string, base: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim(), base)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (
    (host === 'youtube.com' || host === 'youtube-nocookie.com') &&
    parts[0] === 'embed' &&
    parts[1]
  ) {
    return `https://www.youtube.com/watch?v=${parts[1]}`
  }
  if (host === 'facebook.com' && parts[0] === 'plugins') return url.searchParams.get('href')
  if (host === 'dailymotion.com' && parts[0] === 'embed' && parts[2]) {
    return `https://www.dailymotion.com/video/${parts[2]}`
  }
  if (host === 'geo.dailymotion.com') {
    const id = url.searchParams.get('video')
    return id ? `https://www.dailymotion.com/video/${id}` : null
  }
  return url.toString()
}

/**
 * Vidéos (YouTube, Facebook, TikTok, Instagram, Vimeo, Dailymotion) intégrées dans le
 * corps d'un article, sous forme de liens reconnus par le bloc Vidéo du site.
 */
export function extractVideos(html: string, base: string): string[] {
  const $ = cheerio.load(html)
  const found: string[] = []
  const add = (raw: string | undefined | null) => {
    if (!raw) return
    const url = videoFromEmbed(raw, base)
    if (url && getVideoEmbed(url) && !found.includes(url)) found.push(url)
  }
  $('iframe').each((_, el) => {
    add($(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src'))
  })
  $('blockquote.tiktok-embed').each((_, el) => add($(el).attr('cite')))
  $('blockquote.instagram-media').each((_, el) => add($(el).attr('data-instgrm-permalink')))
  // Intégrations WordPress (le lien est écrit seul dans le bloc)
  $('.wp-block-embed__wrapper, .wp-block-embed-youtube, .wp-block-embed-facebook').each((_, el) =>
    add($(el).text().trim().split(/\s+/)[0]),
  )
  return found.slice(0, MAX_VIDEOS)
}

/** Photo de partage (og:image / twitter:image) d'une page. */
const pageImage = (html: string, base: string): string | undefined => {
  const $ = cheerio.load(html)
  for (const sel of [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="twitter:image"]',
  ]) {
    const url = photoUrl($(sel).attr('content'), base)
    if (url) return url
  }
  return undefined
}

const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos'])

/**
 * Certains flux (ex. Walf NET) contiennent des « & » non échappés ou des entités
 * HTML (&nbsp;, &rsquo;…) que le lecteur XML refuse : on les rend valides.
 */
export const repairXml = (xml: string): string =>
  xml
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (entity, name: string) => {
      if (XML_ENTITIES.has(name)) return entity
      const decoded = cheerio.load(entity).text()
      return decoded && decoded !== entity ? `&#${decoded.codePointAt(0)};` : `&amp;${name};`
    })
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')

async function fromRss(source: NewsSource): Promise<SourceItem[]> {
  if (!source.rss) throw new Error('pas de flux RSS')
  const xml = await fetchText(source.rss, source.timeoutMs)
  let feed: Awaited<ReturnType<typeof parser.parseString>>
  try {
    feed = await parser.parseString(repairXml(xml))
  } catch {
    // Flux mal formé (ex. Walf NET : « < » non échappé) : lecture tolérante.
    return lenientRss(xml, source)
  }
  const items: SourceItem[] = []
  for (const it of feed.items) {
    const url = it.link && normalizeUrl(it.link, source.homepage)
    if (!url || !it.title) continue
    items.push({
      source,
      url,
      title: it.title.trim(),
      categories: (it.categories || []).map((c) => (typeof c === 'string' ? c : c?._ || '')),
      contentHtml: it['content:encoded'] || undefined,
      imageUrl:
        (it.enclosure?.type?.startsWith('image') ? photoUrl(it.enclosure.url, url) : undefined) ||
        photoUrl(it.mediaContent?.$?.url, url) ||
        photoUrl(it.mediaThumbnail?.$?.url, url),
    })
  }
  return items
}

/** Lecture tolérante d'un flux RSS invalide (cheerio en mode XML ne s'arrête pas aux erreurs). */
function lenientRss(xml: string, source: NewsSource): SourceItem[] {
  const $ = cheerio.load(xml, { xml: true })
  const items: SourceItem[] = []
  $('item').each((_, el) => {
    const $it = $(el)
    const link =
      $it.children('link').first().text().trim() || $it.children('guid').first().text().trim()
    const title = cheerio.load($it.children('title').first().text()).text().trim()
    const url = link && normalizeUrl(link, source.homepage)
    if (!url || !title) return
    const enclosure = $it.children('enclosure').first()
    items.push({
      source,
      url,
      title,
      categories: $it
        .children('category')
        .toArray()
        .map((c) => $(c).text().trim()),
      contentHtml: $it.children('content\\:encoded').first().text() || undefined,
      imageUrl:
        (enclosure.attr('type')?.startsWith('image')
          ? photoUrl(enclosure.attr('url'), url)
          : undefined) || photoUrl($it.children('media\\:content').first().attr('url'), url),
    })
  })
  if (!items.length) throw new Error('flux RSS illisible')
  return items
}

/** Secours : liens d'articles de la page d'accueil. */
async function fromHomepage(source: NewsSource): Promise<SourceItem[]> {
  const $ = cheerio.load(await fetchText(source.homepage, source.timeoutMs))
  const seen = new Set<string>()
  const items: SourceItem[] = []
  $('a[href]').each((_, a) => {
    const url = normalizeUrl($(a).attr('href') || '', source.homepage)
    if (!url || seen.has(url)) return
    if (
      new URL(url).hostname.replace(/^www\./, '') !==
      new URL(source.homepage).hostname.replace(/^www\./, '')
    )
      return
    if (!source.articleLinkPattern.test(url)) return
    const title = $(a).text().replace(/\s+/g, ' ').trim() || $(a).attr('title') || ''
    if (title.length < 20) return
    seen.add(url)
    items.push({ source, url, title, categories: [] })
  })
  return items
}

/** Derniers articles d'un média : flux RSS, ou page d'accueil si le flux ne répond pas. */
export async function collectSource(
  source: NewsSource,
): Promise<{ items: SourceItem[]; via: 'rss' | 'html'; rssError?: string }> {
  try {
    const items = await fromRss(source)
    if (items.length) return { items, via: 'rss' }
    throw new Error('flux vide')
  } catch (err) {
    const rssError = err instanceof Error ? err.message : String(err)
    const items = await fromHomepage(source)
    return { items, via: 'html', rssError }
  }
}

/** Texte brut d'un fragment HTML, paragraphes séparés par une ligne vide. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html)
  $(
    'script, style, noscript, iframe, figure, figcaption, form, aside, .ads, .ad, .pub, .related, .jp-relatedposts, .sharedaddy, .wp-block-embed',
  ).remove()
  // Encarts « Lire aussi » / « À lire aussi »
  $('p, div, strong').each((_, el) => {
    const t = $(el).text().trim().toLowerCase()
    if (/^(a |à )?lire aussi/.test(t) || /^voir aussi/.test(t)) $(el).remove()
  })
  const blocks: string[] = []
  $('h1, h2, h3, h4, p, li, blockquote').each((_, el) => {
    if ($(el).find('p, li').length) return // évite les doublons de blocs imbriqués
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t) blocks.push(t)
  })
  const text = blocks.length ? blocks.join('\n\n') : $.root().text().replace(/\s+/g, ' ').trim()
  return text.trim()
}

/**
 * Texte de l'article : celui du flux s'il est complet, sinon extrait de la page
 * (@extractus/article-extractor, puis sélecteurs CSS du média en secours).
 */
export async function extractArticleText(
  item: SourceItem,
): Promise<{ text: string; via: 'rss' | 'page'; imageUrl?: string; videos: string[] }> {
  if (item.contentHtml) {
    const text = htmlToText(item.contentHtml)
    if (text.length > RSS_CONTENT_MIN_CHARS) {
      let imageUrl = item.imageUrl || firstImage(item.contentHtml, item.url)
      if (!imageUrl) {
        // Le flux ne donne pas de photo : on la cherche dans la page (og:image).
        try {
          imageUrl = pageImage(await fetchText(item.url, item.source.timeoutMs), item.url)
        } catch {
          // sans photo d'origine
        }
      }
      return { text, via: 'rss', imageUrl, videos: extractVideos(item.contentHtml, item.url) }
    }
  }
  const html = await fetchText(item.url, item.source.timeoutMs)
  let text = ''
  let articleImage: string | undefined
  try {
    const article = await extractFromHtml(html, item.url)
    if (article?.content) text = htmlToText(article.content)
    articleImage =
      photoUrl(article?.image, item.url) ||
      (article?.content ? firstImage(article.content, item.url) : undefined)
  } catch {
    // on passe au secours
  }
  // Corps de l'article dans la page (pour le texte de secours et les vidéos).
  const $ = cheerio.load(html)
  let bodyHtml = ''
  for (const sel of item.source.contentSelectors) {
    const fragment = $(sel).first().html()
    if (!fragment) continue
    if (!bodyHtml) bodyHtml = fragment
    if (text.length < MIN_TEXT_CHARS) {
      const candidate = htmlToText(fragment)
      if (candidate.length > text.length) {
        text = candidate
        bodyHtml = fragment
      }
    }
  }
  const imageUrl = pageImage(html, item.url) || item.imageUrl || articleImage
  return { text, via: 'page', imageUrl, videos: bodyHtml ? extractVideos(bodyHtml, item.url) : [] }
}
