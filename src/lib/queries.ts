import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Article, Category, Comment, Live, Radio } from '../payload-types'
import { DEFAULT_SOCIAL_LINKS } from '../globals/SocialLinks'
import { publicArticlesWhere } from './publicWhere'

export const getClient = cache(async () => getPayload({ config: configPromise }))

/**
 * Pendant `next build`, la base peut être injoignable (build local sans base) :
 * on rend alors une page vide, qui sera régénérée dès la première visite (ISR).
 */
export async function buildSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return fn()
  try {
    return await fn()
  } catch (err) {
    console.warn('[build] base injoignable, page générée vide :', (err as Error).message)
    return fallback
  }
}

const emptyPage = (limit: number, page: number) => ({
  docs: [] as Article[],
  totalDocs: 0,
  limit,
  totalPages: 0,
  page,
  pagingCounter: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
})

const published = publicArticlesWhere

export const getCategories = cache(async (): Promise<Category[]> =>
  buildSafe(async () => {
    const payload = await getClient()
    const res = await payload.find({
      collection: 'categories',
      sort: 'order',
      limit: 50,
      depth: 0,
    })
    return res.docs
  }, []),
)

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return res.docs[0] ?? null
})

type ListOptions = {
  limit?: number
  page?: number
  categoryId?: number | string
  featured?: boolean
  breaking?: boolean
  excludeIds?: (number | string)[]
}

export const getArticles = async ({
  limit = 10,
  page = 1,
  categoryId,
  featured,
  breaking,
  excludeIds,
}: ListOptions = {}) => {
  const payload = await buildSafe(() => getClient(), null)
  if (!payload) return emptyPage(limit, page)
  const and: Record<string, unknown>[] = [published()]
  if (categoryId !== undefined) and.push({ category: { equals: categoryId } })
  if (featured !== undefined) and.push({ featured: { equals: featured } })
  if (breaking !== undefined) and.push({ breaking: { equals: breaking } })
  if (excludeIds?.length) and.push({ id: { not_in: excludeIds } })

  return buildSafe(
    () =>
      payload.find({
        collection: 'articles',
        where: { and } as never,
        sort: '-publishedAt',
        limit,
        page,
        depth: 1,
      }),
    emptyPage(limit, page),
  )
}

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'articles',
    where: { and: [{ slug: { equals: slug } }, published()] } as never,
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
})

/** Dernière version (brouillon compris) d'un article, pour l'aperçu en direct de l'admin. */
export const getArticlePreview = cache(async (slug: string): Promise<Article | null> => {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    draft: true,
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
})

export const getRadios = cache(async (): Promise<Radio[]> =>
  buildSafe(async () => {
    const payload = await getClient()
    const res = await payload.find({
      collection: 'radios',
      where: { active: { equals: true } },
      sort: 'order',
      limit: 20,
      depth: 1,
    })
    return res.docs
  }, []),
)

/** Directs en cours (bandeau de l'accueil, menu). */
export const getActiveLives = cache(async (): Promise<Live[]> =>
  buildSafe(async () => {
    const payload = await getClient()
    const res = await payload.find({
      collection: 'lives',
      where: { status: { equals: 'live' } },
      sort: '-startedAt',
      limit: 3,
      depth: 0,
    })
    return res.docs
  }, []),
)

/** Tous les directs visibles (page /direct). */
export const getLives = cache(async (): Promise<Live[]> =>
  buildSafe(async () => {
    const payload = await getClient()
    const res = await payload.find({
      collection: 'lives',
      where: { status: { not_equals: 'draft' } },
      sort: '-startedAt',
      limit: 50,
      depth: 1,
    })
    return res.docs
  }, []),
)

/** Commentaires validés d'un article, du plus ancien au plus récent. */
export const getComments = cache(async (articleId: number): Promise<Comment[]> =>
  buildSafe(async () => {
    const payload = await getClient()
    const res = await payload.find({
      collection: 'comments',
      where: { and: [{ article: { equals: articleId } }, { status: { equals: 'approved' } }] },
      sort: 'createdAt',
      limit: 200,
      depth: 0,
      select: { name: true, content: true, createdAt: true },
    })
    return res.docs as Comment[]
  }, []),
)

export type SocialNetwork = 'youtube' | 'facebook' | 'instagram' | 'x' | 'tiktok'
const SOCIAL_ORDER: SocialNetwork[] = ['facebook', 'youtube', 'instagram', 'x', 'tiktok']

/** Liens des réseaux sociaux renseignés dans l'admin (Réglages → Réseaux sociaux). */
export const getSocialLinks = cache(
  async (): Promise<{ network: SocialNetwork; url: string }[]> => {
    const fallback = DEFAULT_SOCIAL_LINKS as Partial<Record<SocialNetwork, string>>
    const values = await buildSafe(async () => {
      const payload = await getClient()
      const doc = await payload.findGlobal({ slug: 'social-links', depth: 0 })
      // Jamais enregistré dans l'admin : liens par défaut.
      return doc?.updatedAt ? (doc as Partial<Record<SocialNetwork, string | null>>) : fallback
    }, fallback).catch(() => fallback)
    return SOCIAL_ORDER.flatMap((network) => {
      const url = values[network]?.trim()
      return url ? [{ network, url }] : []
    })
  },
)
