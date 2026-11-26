import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Article, Category } from '../payload-types'

export const getClient = cache(async () => getPayload({ config: configPromise }))

const PUBLISHED = { _status: { equals: 'published' } } as const

export const getCategories = cache(async (): Promise<Category[]> => {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'categories',
    sort: 'order',
    limit: 50,
    depth: 0,
  })
  return res.docs
})

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
  const payload = await getClient()
  const and: Record<string, unknown>[] = [PUBLISHED]
  if (categoryId !== undefined) and.push({ category: { equals: categoryId } })
  if (featured !== undefined) and.push({ featured: { equals: featured } })
  if (breaking !== undefined) and.push({ breaking: { equals: breaking } })
  if (excludeIds?.length) and.push({ id: { not_in: excludeIds } })

  return payload.find({
    collection: 'articles',
    where: { and } as never,
    sort: '-publishedAt',
    limit,
    page,
    depth: 1,
  })
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

/** Ajoute une lecture à l'article (écriture directe en base : pas de nouvelle version). */
export async function incrementViews(article: { id: number | string; views?: number | null }) {
  try {
    const payload = await getClient()
    await payload.db.updateOne({
      collection: 'articles',
      id: article.id,
      data: { views: (article.views || 0) + 1 },
      returning: false,
    })
  } catch (err) {
    console.error('incrementViews', err)
  }
}
