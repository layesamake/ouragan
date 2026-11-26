import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

/**
 * GET /apercu?slug=… — utilisé par l'aperçu en direct de l'administration.
 * Réservé au rédacteur connecté : active le mode aperçu de Next (brouillons visibles,
 * page non mise en cache) puis ouvre l'article.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') || ''
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user)
    return new Response('Connectez-vous à l’administration pour voir l’aperçu.', { status: 401 })
  ;(await draftMode()).enable()
  redirect(`/article/${encodeURIComponent(slug)}`)
}
