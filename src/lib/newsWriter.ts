import Anthropic from '@anthropic-ai/sdk'

import type { ContentBlock } from './lexicalFormatter'
import type { NewsSource } from './newsSources'

/** Texte source envoyé à l'IA au plus (en caractères). */
export const MAX_SOURCE_CHARS = 6_000
export const DEFAULT_MODEL = 'claude-haiku-5-5'

export type CategoryChoice = { id: number; name: string; slug: string }

export type RewriteResult =
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
- Cite obligatoirement le média d'origine dans le premier ou le deuxième paragraphe, avec la formule indiquée.
- De 4 à 8 paragraphes. Au-delà de 4 paragraphes, ajoute un ou deux sous-titres pertinents.
- Titre : informatif et optimisé pour le référencement, 80 caractères au plus, sans point final.
- Chapô : l'essentiel de l'information en deux phrases.
- Surtitre : un ou deux mots en majuscules (ex. POLITIQUE, ÉCONOMIE, DIPLOMATIE, JUSTICE, SANTÉ).
- Rubrique : l'id de la rubrique la plus pertinente dans la liste fournie.
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

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Réécrit un article avec Claude. */
export async function rewriteArticle(args: {
  source: NewsSource
  url: string
  title: string
  text: string
  categories: CategoryChoice[]
}): Promise<RewriteResult> {
  const sourceText = args.text.slice(0, MAX_SOURCE_CHARS)
  const rubriques = args.categories.map((c) => `- id ${c.id} : ${c.name}`).join('\n')

  const response = await getAnthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 16_000,
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Média d'origine : ${args.source.name}
Formule d'attribution : « ${args.source.attribution}… »
Rubriques disponibles :
${rubriques}

<article_source titre="${args.title.replace(/"/g, "'")}">
${sourceText}
</article_source>`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') return { skip: true, reason: 'Refus du modèle' }
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse de l’IA tronquée')
  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const data = parseJsonReply(raw) as Record<string, unknown>

  if (data.skip === true) return { skip: true, reason: str(data.reason) || 'Hors ligne éditoriale' }

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
    categoryId: Number(data.categoryId),
    imageSubject: str(data.imageSubject) || null,
    imageQueries: Array.isArray(data.imageQueries)
      ? data.imageQueries.map(str).filter(Boolean).slice(0, 3)
      : [],
    blocks,
  }
}
