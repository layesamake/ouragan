import type { Payload } from 'payload'

/**
 * Photo principale des brouillons IA : photo libre de droits trouvée sur Pexels
 * (licence Pexels : usage gratuit, y compris commercial, sans autorisation).
 * Le photographe est crédité dans le champ « Crédit photo ».
 * Sans PEXELS_API_KEY, les brouillons restent sans photo.
 */

type PexelsPhoto = {
  id: number
  alt?: string | null
  photographer: string
  src: { large2x: string; large: string; landscape: string }
}

const PEXELS_TIMEOUT_MS = 10_000

async function searchPexels(query: string, apiKey: string): Promise<PexelsPhoto[]> {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '10')
  url.searchParams.set('orientation', 'landscape')
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(PEXELS_TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const data = (await res.json()) as { photos?: PexelsPhoto[] }
  return data.photos || []
}

/**
 * Cherche une photo pour chaque requête (de la plus précise à la plus large),
 * l'importe dans la médiathèque et renvoie son id, ou null si rien ne convient.
 * `usedIds` évite de mettre la même photo sur deux brouillons d'un même passage.
 */
export async function findCoverImage(
  payload: Payload,
  args: { queries: string[]; alt: string; usedIds: Set<number> },
): Promise<number | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null

  for (const query of args.queries.map((q) => q.trim()).filter(Boolean)) {
    const photos = await searchPexels(query, apiKey)
    const photo = photos.find((p) => !args.usedIds.has(p.id))
    if (!photo) continue
    args.usedIds.add(photo.id)

    const res = await fetch(photo.src.large2x || photo.src.large, {
      signal: AbortSignal.timeout(PEXELS_TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Téléchargement de la photo Pexels : HTTP ${res.status}`)
    const data = Buffer.from(await res.arrayBuffer())
    const mimetype = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'

    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: args.alt.slice(0, 200),
        credit: `Photo : ${photo.photographer} / Pexels`,
      },
      file: {
        data,
        mimetype,
        name: `pexels-${photo.id}.jpg`,
        size: data.length,
      },
    })
    return media.id
  }
  return null
}
