/**
 * Médias surveillés par la rédaction IA, et règles de filtrage.
 * Pour ajouter / retirer un média, modifier simplement NEWS_SOURCES.
 */

/** Groupe de médias traité par un même appel de la route (?group=…). */
export type NewsGroup = 'senegal' | 'afrique' | 'international'

export type NewsSource = {
  /** Groupe du média : « senegal » (par défaut), « afrique » ou « international ». */
  group?: NewsGroup
  /** Rubrique imposée (slug) : les articles de ce média y vont toujours. */
  category?: string
  /** Nom affiché et cité dans l'article (« Selon … »). */
  name: string
  /** Formule d'attribution proposée à l'IA. */
  attribution: string
  homepage: string
  /** Flux RSS ; null si le média n'en publie pas (lecture de la page d'accueil). */
  rss: string | null
  /** Délai d'attente propre au média (site lent), en millisecondes. */
  timeoutMs?: number
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
    timeoutMs: 25_000, // site lent : délai dépassé à 10 s lors du premier passage
    articleLinkPattern: WP_ARTICLE,
    contentSelectors: WP_SELECTORS,
  },
  {
    name: 'Seneweb',
    attribution: 'Comme le rapporte Seneweb',
    homepage: 'https://www.seneweb.com/',
    rss: null, // l'ancienne adresse /news/rss.xml répond 404
    articleLinkPattern: /\/news\/[^/]+\/[^/]+_n_\d+\.html$/i,
    contentSelectors: ['.article-content', '.content-article', '#article-content', 'article'],
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

/** Corps d'article des grands sites d'information (secours de l'extraction). */
const NEWS_SELECTORS = [
  '.article__content',
  '.t-content__body',
  '.textModule',
  '.content_body',
  '[data-component="text-block"]',
  '.post-content',
  '.entry-content',
  'article',
  'main',
]

/** Médias africains : rubrique « Afrique ». */
const AFRIQUE_SOURCES: NewsSource[] = [
  {
    name: 'Jeune Afrique',
    attribution: 'Selon Jeune Afrique',
    homepage: 'https://www.jeuneafrique.com/',
    rss: 'https://www.jeuneafrique.com/feed/',
    articleLinkPattern: /jeuneafrique\.com\/\d{6,}\/[a-z-]+\/[a-z0-9-]{15,}\/?$/i,
    contentSelectors: NEWS_SELECTORS,
  },
  {
    name: 'BBC Afrique',
    attribution: 'Selon BBC Afrique',
    homepage: 'https://www.bbc.com/afrique',
    rss: 'https://feeds.bbci.co.uk/afrique/rss.xml',
    articleLinkPattern: /\/afrique\/(?:articles\/[a-z0-9]{8,}|[a-z-]+-\d{8})$/i,
    contentSelectors: NEWS_SELECTORS,
  },
  {
    name: 'RFI',
    attribution: 'Comme le rapporte RFI',
    homepage: 'https://www.rfi.fr/fr/afrique/',
    rss: 'https://www.rfi.fr/fr/afrique/rss',
    articleLinkPattern: /\/fr\/[a-z-]+\/\d{8}-[a-z0-9-]{15,}$/i,
    contentSelectors: NEWS_SELECTORS,
  },
  {
    name: 'Sputnik Afrique',
    attribution: 'Selon l’agence Sputnik Afrique',
    homepage: 'https://fr.sputniknews.africa/',
    rss: 'https://fr.sputniknews.africa/export/rss2/archive/index.xml',
    articleLinkPattern: /sputniknews\.africa\/\d{8}\/[a-z0-9-]{15,}\.html$/i,
    contentSelectors: ['.article__text', '.article__body', ...NEWS_SELECTORS],
  },
].map((s) => ({ ...s, group: 'afrique' as const, category: 'afrique' }))

/** Médias internationaux : rubrique « International ». */
const INTERNATIONAL_SOURCES: NewsSource[] = [
  {
    name: 'La Presse',
    attribution: 'D’après La Presse',
    homepage: 'https://www.lapresse.ca/international/',
    rss: 'https://www.lapresse.ca/international/rss',
    articleLinkPattern:
      /\/international\/(?:[a-z0-9-]+\/)*\d{4}-\d{2}-\d{2}\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.php$/i,
    contentSelectors: NEWS_SELECTORS,
  },
  {
    name: 'BFMTV',
    attribution: 'Selon BFMTV',
    homepage: 'https://www.bfmtv.com/international/',
    rss: 'https://www.bfmtv.com/rss/international/',
    articleLinkPattern: /\/international\/.+_A[A-Z]-\d{12}\.html$/,
    contentSelectors: NEWS_SELECTORS,
  },
  {
    name: 'TASS',
    attribution: 'Selon l’agence russe TASS',
    homepage: 'https://tass.com/',
    rss: 'https://tass.com/rss/v2.xml',
    articleLinkPattern: /tass\.com\/[a-z-]+\/\d{6,}$/i,
    contentSelectors: ['.text-block', '.news__text', ...NEWS_SELECTORS],
  },
  {
    name: 'IRNA',
    attribution: 'Selon l’agence iranienne IRNA',
    homepage: 'https://fr.irna.ir/',
    rss: 'https://fr.irna.ir/rss',
    articleLinkPattern: /irna\.ir\/news\/\d{6,}\/[^/]+$/i,
    contentSelectors: ['.item-text', '.item-body', ...NEWS_SELECTORS],
  },
].map((s) => ({ ...s, group: 'international' as const, category: 'international' }))

NEWS_SOURCES.push(...AFRIQUE_SOURCES, ...INTERNATIONAL_SOURCES)

/** Médias d'un groupe. */
export const sourcesOf = (group: NewsGroup): NewsSource[] =>
  NEWS_SOURCES.filter((s) => (s.group ?? 'senegal') === group)

/**
 * Plafonds par groupe et par exécution, choisis pour économiser les crédits de l'API :
 * au plus 12 + 6 + 4 = 22 brouillons par jour.
 */
export const GROUP_LIMITS: Record<NewsGroup, { perSource: number; perRun: number }> = {
  senegal: { perSource: 3, perRun: 12 },
  afrique: { perSource: 2, perRun: 6 },
  international: { perSource: 2, perRun: 6 },
}

/** En-têtes d'un navigateur ordinaire (certains sites refusent les robots sans User-Agent). */
export const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
}
export const HTTP_TIMEOUT_MS = 10_000

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
