/**
 * Médias surveillés par la rédaction IA, et règles de filtrage.
 * Pour ajouter / retirer un média, modifier simplement NEWS_SOURCES.
 */

export type NewsSource = {
  /** Nom affiché et cité dans l'article (« Selon … »). */
  name: string
  /** Formule d'attribution proposée à l'IA. */
  attribution: string
  homepage: string
  rss: string
  /** Liens d'articles reconnus sur la page d'accueil (secours si le flux RSS est indisponible). */
  articleLinkPattern: RegExp
  /** Sélecteurs CSS du corps de l'article (secours de l'extraction). */
  contentSelectors: string[]
}

/** Motif des articles WordPress : /annee/mois/jour/slug/ ou /slug-long/. */
const WP_ARTICLE = /^https?:\/\/[^/]+\/(?:\d{4}\/\d{2}\/(?:\d{2}\/)?)?[a-z0-9-]{25,}\/?$/i
const WP_SELECTORS = [
  '.entry-content',
  '.td-post-content',
  '.post-content',
  'article .content',
  'article',
]

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Le Soleil',
    attribution: 'D’après Le Soleil',
    homepage: 'https://lesoleil.sn/',
    rss: 'https://lesoleil.sn/feed/',
    articleLinkPattern: WP_ARTICLE,
    contentSelectors: WP_SELECTORS,
  },
  {
    name: 'APS',
    attribution: 'Selon les informations rapportées par l’APS',
    homepage: 'https://aps.sn/',
    rss: 'https://aps.sn/feed/',
    articleLinkPattern: WP_ARTICLE,
    contentSelectors: WP_SELECTORS,
  },
  {
    name: 'Seneweb',
    attribution: 'Comme le rapporte Seneweb',
    homepage: 'https://www.seneweb.com/',
    rss: 'https://www.seneweb.com/news/rss.xml',
    articleLinkPattern: /\/news\/[^/]+\/[^/]+_n_\d+\.html$/i,
    contentSelectors: ['.article-content', '.content-article', '#article-content', 'article'],
  },
  {
    name: 'Walf NET',
    attribution: 'Selon Walf NET',
    homepage: 'https://walf-groupe.com/',
    rss: 'https://walf-groupe.com/feed/',
    articleLinkPattern: WP_ARTICLE,
    contentSelectors: WP_SELECTORS,
  },
  {
    name: 'SeneNews',
    attribution: 'D’après SeneNews',
    homepage: 'https://www.senenews.com/',
    rss: 'https://www.senenews.com/feed/',
    articleLinkPattern: WP_ARTICLE,
    contentSelectors: WP_SELECTORS,
  },
  {
    name: 'PressAfrik',
    attribution: 'Selon PressAfrik',
    homepage: 'https://www.pressafrik.com/',
    rss: 'https://www.pressafrik.com/xml/syndication.rss',
    articleLinkPattern: /\/[A-Za-z0-9-]+_a\d+\.html$/,
    contentSelectors: ['.texte', '#article .texte', '.article', 'article'],
  },
]

/** En-têtes d'un navigateur ordinaire (certains sites refusent les robots sans User-Agent). */
export const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
}
export const HTTP_TIMEOUT_MS = 10_000

/** Articles retenus au plus par média et par exécution. */
export const MAX_PER_SOURCE = 3
/** Articles créés au plus par exécution. */
export const MAX_CREATED_PER_RUN = 12

/**
 * Rubriques exclues, recherchées dans l'adresse et les catégories RSS
 * (comparaison sans accents ni majuscules, par mot entier).
 */
export const EXCLUDED_KEYWORDS = [
  'faits-divers',
  'fait-divers',
  'faits divers',
  'fait divers',
  'people',
  'celebrites',
  'buzz',
  'sunubuzz',
  'insolite',
  'necrologie',
  'avis-de-deces',
  'avis de deces',
  'horoscope',
  'video',
  'videos',
  'webtv',
  'podcast',
  'revue-de-presse',
  'revue de presse',
  'sponsorise',
  'publi-reportage',
  'publireportage',
]

/**
 * Sous-ensemble cherché aussi dans le titre : des mots sans ambiguïté.
 * (« vidéo » ou « people » apparaissent dans des titres d'actualité légitimes.)
 */
export const EXCLUDED_TITLE_KEYWORDS = [
  'faits divers',
  'fait divers',
  'insolite',
  'necrologie',
  'avis de deces',
  'horoscope',
  'revue de presse',
  'sponsorise',
  'publireportage',
  'publi-reportage',
]

/** Minuscules, sans accents, ponctuation remplacée par des espaces. */
const plain = (value: string): string =>
  ` ${value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()} `

const containsKeyword = (haystack: string, keywords: string[]): string | null => {
  const text = plain(haystack)
  const dashed = text.replace(/ /g, '-')
  for (const k of keywords) {
    const key = plain(k).trim()
    // mot entier : « video » trouve « /video/ » ou « video-du-jour » mais pas « videosurveillance »
    const re = new RegExp(`(^|[\\s-])${key.replace(/[-\s]/g, '[-\\s]')}($|[\\s-])`)
    if (re.test(text) || re.test(dashed)) return k
  }
  return null
}

/** Renvoie le mot-clé qui exclut l'article, ou null s'il peut être traité. */
export function excludedBy(item: {
  url: string
  title: string
  categories: string[]
}): string | null {
  let path = item.url
  try {
    path = new URL(item.url).pathname
  } catch {
    // adresse déjà relative
  }
  return (
    containsKeyword(path.replace(/[/_.]/g, ' '), EXCLUDED_KEYWORDS) ||
    containsKeyword(item.categories.join(' | '), EXCLUDED_KEYWORDS) ||
    containsKeyword(item.title, EXCLUDED_TITLE_KEYWORDS)
  )
}

const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|ref|amp|mc_cid|mc_eid|igshid)$/i

/**
 * Adresse canonique d'un article : absolue, en HTTPS, sans paramètres de suivi,
 * sans ancre ni slash final. Sert à repérer les doublons.
 */
export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw.trim(), base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.protocol = 'https:'
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key)
    }
    let out = url.toString()
    if (out.endsWith('/') && url.pathname !== '/' && !url.search) out = out.slice(0, -1)
    return out
  } catch {
    return null
  }
}
