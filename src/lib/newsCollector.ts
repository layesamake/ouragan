import { extractFromHtml } from '@extractus/article-extractor'
import * as cheerio from 'cheerio'
import Parser from 'rss-parser'

import { HTTP_HEADERS, HTTP_TIMEOUT_MS, normalizeUrl, type NewsSource } from './newsSources'

/** Article repéré dans le flux (ou sur la page d'accueil) d'un média. */
export type SourceItem = {
  source: NewsSource
  url: string
  title: string
  categories: string[]
  /** Corps complet fourni par le flux (<content:encoded>), en HTML. */
  contentHtml?: string
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

type FeedItem = {
  'content:encoded'?: string
  categories?: (string | { _: string })[]
}
const parser: Parser<object, FeedItem> = new Parser({
  customFields: { item: ['content:encoded'] },
})

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
  const feed = await parser.parseString(repairXml(xml))
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
    })
  }
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
): Promise<{ text: string; via: 'rss' | 'page' }> {
  if (item.contentHtml) {
    const text = htmlToText(item.contentHtml)
    if (text.length > RSS_CONTENT_MIN_CHARS) return { text, via: 'rss' }
  }
  const html = await fetchText(item.url, item.source.timeoutMs)
  let text = ''
  try {
    const article = await extractFromHtml(html, item.url)
    if (article?.content) text = htmlToText(article.content)
  } catch {
    // on passe au secours
  }
  if (text.length < MIN_TEXT_CHARS) {
    const $ = cheerio.load(html)
    for (const sel of item.source.contentSelectors) {
      const fragment = $(sel).first().html()
      if (!fragment) continue
      const candidate = htmlToText(fragment)
      if (candidate.length > text.length) text = candidate
      if (text.length >= MIN_TEXT_CHARS) break
    }
  }
  return { text, via: 'page' }
}
