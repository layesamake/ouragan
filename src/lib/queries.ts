import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Article, Category, Radio } from '../payload-types'

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

const PUBLISHED = { _status: { equals: 'published' } } as const

export const getCategories = cache(
  async (): Promise<Category[]> =>
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
  const and: Record<string, unknown>[] = [PUBLISHED]
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
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
})


export const getRadios = cache(
  async (): Promise<Radio[]> =>
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
