import Anthropic from '@anthropic-ai/sdk'

import type { ContentBlock } from './lexicalFormatter'
import type { NewsSource } from './newsSources'

/** Texte source envoyé à l'IA au plus (en caractères). */
export const MAX_SOURCE_CHARS = 4_000
export const DEFAULT_MODEL = 'claude-haiku-5-5'

export type CategoryChoice = { id: number; name: string; slug: string }

/** Jetons consommés par un appel (pour le rapport de coût). */
export type Usage = { input: number; cacheRead: number; cacheWrite: number; output: number }

/** Tarif de Claude Haiku 5.5, en dollars par million de jetons. */
const PRICE = { input: 0.1, cacheRead: 0.01, cacheWrite: 0.125, output: 0.5 }
export const costUsd = (u: Usage): number =>
  (u.input * PRICE.input +
    u.cacheRead * PRICE.cacheRead +
    u.cacheWrite * PRICE.cacheWrite +
    u.output * PRICE.output) /
  1_000_000

export type RewriteResult = (
  | { skip: true; reason: string }
  | {
      skip: false
      kicker: string
      /** Personne ou lieu principal, tel que nommé sur Wikipédia (photo Wikimedia Commons). */
      imageSubject: string | null
      /** Recherches de photo thématique (en anglais), de la plus précise à la plus large. */
      imageQueries: string[]
      title: string
      excerpt: string
      categoryId: number
      blocks: ContentBlock[]
    }
) & { usage?: Usage }

let client: Anthropic | null = null
const getAnthropic = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }))

const SYSTEM_PROMPT = `Tu es le rédacteur en chef d'Ouragan.sn, site d'information sénégalais.
On te donne un article publié par un autre média. Tu rédiges pour Ouragan.sn un article original sur le même sujet.

LIGNE ÉDITORIALE
Ouragan.sn ne couvre que l'actualité institutionnelle, politique, économique, sociétale de fond, culturelle et sportive.
Priorité géographique : le Sénégal d'abord, puis l'Afrique, puis la grande géopolitique internationale
(conflits, diplomatie, sommets, organisations internationales, grandes puissances, matières premières, relations
avec l'Afrique). Rejette aussi un sujet étranger d'intérêt seulement local ou national pour un autre pays
(entreprise, fait de société ou polémique médiatique d'un autre pays) sans portée pour le Sénégal, l'Afrique
ou l'équilibre international.
Rejette l'article (skip = true, avec la raison en une phrase) s'il s'agit de :
- un fait divers : accident de la route, meurtre ou agression isolée, vol, arrestation sans portée publique, incendie local ;
- un scandale privé, de la presse people ou du « buzz » ;
- une rumeur ou une polémique née sur les réseaux sociaux ;
- un avis de décès, une nécrologie, un horoscope, un contenu sponsorisé, une revue de presse ;
- un texte trop pauvre en faits pour écrire un article.

RÉDACTION
- Français journalistique irréprochable : factuel, neutre, clair, structuré. Pas d'opinion, pas de sensationnalisme.
- Reformulation intégrale : n'en reprends aucune phrase, ni de tournure reconnaissable. Seules les citations de personnes peuvent être reprises, entre guillemets et attribuées.
- N'invente rien : aucun chiffre, nom, date ni citation absents de la source.
- La source peut être en anglais (ex. TASS) : rédige toujours en français.
- Si la source est une agence d'État (TASS, IRNA, Sputnik) : attribue chaque affirmation officielle à l'agence ou à son auteur (« selon… », « affirme… »), ne la présente jamais comme un fait établi, et écarte la propagande ou les attaques sans éléments vérifiables.
- Cite obligatoirement le média d'origine dans le premier ou le deuxième paragraphe, avec la formule indiquée.
- De 4 à 8 paragraphes. Au-delà de 4 paragraphes, ajoute un ou deux sous-titres pertinents.
- Titre : informatif et optimisé pour le référencement, 80 caractères au plus, sans point final.
- Chapô : l'essentiel de l'information en deux phrases.
- Surtitre : un ou deux mots en majuscules (ex. POLITIQUE, ÉCONOMIE, DIPLOMATIE, JUSTICE, SANTÉ).
- Rubrique : l'id de la rubrique la plus pertinente dans la liste fournie (ou celle imposée).
- Photo, sujet : la personne ou le lieu principal de l'article, écrit comme le titre de sa page Wikipédia
  (ex. "Ousmane Sonko", "Bassirou Diomaye Faye", "Assemblée nationale du Sénégal", "Kédougou", "Stade Abdoulaye-Wade").
  null s'il n'y en a pas de clairement identifiable.
- Photo, secours : 2 ou 3 recherches EN ANGLAIS pour une banque de photos libres, de la plus précise à la plus large
  (ex. ["gold mine Senegal", "gold mining", "mining industry"]). Une scène, un lieu ou un objet, jamais une personne nommée.

FORMAT DE RÉPONSE
Réponds uniquement par un objet JSON, sans texte autour ni balises Markdown :
{"skip": false, "reason": null, "kicker": "…", "title": "…", "excerpt": "…", "categoryId": 1, "imageSubject": "…", "imageQueries": ["…", "…"], "blocks": [{"type": "paragraph", "text": "…"}, {"type": "heading", "text": "…"}, {"type": "paragraph", "text": "…"}]}
Pour rejeter : {"skip": true, "reason": "…"}`

/** Extrait l'objet JSON de la réponse, même entouré de ```json … ``` ou de texte. */
export function parseJsonReply(raw: string): unknown {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Réponse de l’IA sans JSON')
  return JSON.parse(text.slice(start, end + 1))
}

/** Mots significatifs d'un texte (minuscules, sans accents, 4 lettres et plus). */
export const keywords = (text: string): Set<string> =>
  new Set(
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  )

const STOPWORDS = new Set(
  'avec dans pour plus mais leur leurs sont sera cette apres avant entre sous selon depuis contre lors tous toute toutes comme fait faire etre avoir deux trois nouveau nouvelle nouvelles annonce annoncent president gouvernement ministre senegal afrique pays national nationale'.split(
    ' ',
  ),
)

/**
 * Ne garde des titres récents que ceux qui partagent au moins deux mots significatifs avec
 * l'article : l'IA reçoit 0 à 10 titres au lieu de 60 (moins de jetons, même anti-doublon).
 */
export function relatedTitles(text: string, titles: string[]): string[] {
  const words = keywords(text)
  return titles.filter((t) => [...keywords(t)].filter((w) => words.has(w)).length >= 2).slice(0, 10)
}

/**
 * Doublon évident sans appeler l'IA : un titre récent dont au moins 60 % des mots
 * significatifs se retrouvent dans le titre de l'article.
 */
export function obviousDuplicate(title: string, titles: string[]): string | null {
  const words = keywords(title)
  for (const t of titles) {
    const other = [...keywords(t)]
    if (other.length < 3) continue
    const shared = other.filter((w) => words.has(w)).length
    if (shared / other.length >= 0.6) return t
  }
  return null
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Réécrit un article avec Claude. */
export async function rewriteArticle(args: {
  source: NewsSource
  url: string
  title: string
  text: string
  categories: CategoryChoice[]
  /** Titres des articles déjà préparés ces derniers jours (évite deux articles sur le même événement). */
  recentTitles?: string[]
  /** Rubrique imposée par le média (Afrique, International). */
  forcedCategory?: CategoryChoice
}): Promise<RewriteResult> {
  const sourceText = args.text.slice(0, MAX_SOURCE_CHARS)
  const forced = args.forcedCategory
  const rubriques = forced
    ? `Rubrique imposée : id ${forced.id} (${forced.name}).
Ce média alimente la rubrique ${forced.name} : la priorité géographique ne s'applique pas. Retiens les sujets
majeurs (politique, diplomatie, conflits, économie, élections, grandes décisions) et rejette toujours les faits
divers, le people, le buzz et les sujets d'intérêt seulement local.`
    : `Rubriques disponibles :
${args.categories.map((c) => `- id ${c.id} : ${c.name}`).join('\n')}`
  const related = relatedTitles(
    `${args.title} ${sourceText.slice(0, 600)}`,
    args.recentTitles ?? [],
  )

  const response = await getAnthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 16_000,
    // Sans réflexion préalable : la réécriture n'en a pas besoin, et ces jetons sont facturés.
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    // Consigne identique à chaque appel : mise en cache (lue à 10 % du prix pendant 5 min).
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `Média d'origine : ${args.source.name}
Formule d'attribution : « ${args.source.attribution}… »
${rubriques}

${
  related.length
    ? `Articles déjà préparés ces derniers jours (rejette l'article s'il traite du MÊME événement, même vu par un autre média) :
${related.map((t) => `- ${t}`).join('\n')}

`
    : ''
}<article_source titre="${args.title.replace(/"/g, "'")}">
${sourceText}
</article_source>`,
      },
    ],
  })

  const usage: Usage = {
    input: response.usage.input_tokens,
    cacheRead: response.usage.cache_read_input_tokens ?? 0,
    cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    output: response.usage.output_tokens,
  }
  if (response.stop_reason === 'refusal') return { skip: true, reason: 'Refus du modèle', usage }
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse de l’IA tronquée')
  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const data = parseJsonReply(raw) as Record<string, unknown>

  if (data.skip === true) {
    return { skip: true, reason: str(data.reason) || 'Hors ligne éditoriale', usage }
  }

  const blocks: ContentBlock[] = Array.isArray(data.blocks)
    ? data.blocks
        .map((b) => b as Record<string, unknown>)
        .map((b) => ({
          type: b.type === 'heading' ? ('heading' as const) : ('paragraph' as const),
          text: str(b.text),
        }))
        .filter((b) => b.text)
    : []
  const title = str(data.title).replace(/\.$/, '')
  if (!title || blocks.filter((b) => b.type === 'paragraph').length < 2) {
    throw new Error('Réponse de l’IA incomplète (titre ou texte manquant)')
  }
  return {
    skip: false,
    kicker: str(data.kicker).toUpperCase().slice(0, 40),
    title: title.slice(0, 120),
    excerpt: str(data.excerpt),
    categoryId: forced ? forced.id : Number(data.categoryId),
    imageSubject: str(data.imageSubject) || null,
    imageQueries: Array.isArray(data.imageQueries)
      ? data.imageQueries.map(str).filter(Boolean).slice(0, 3)
      : [],
    blocks,
    usage,
  }
}
