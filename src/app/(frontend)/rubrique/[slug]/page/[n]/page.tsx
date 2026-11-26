import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CategoryView, categoryMetadata } from '../../../../../../components/CategoryView'

export const revalidate = 60

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string; n: string }> }

const parsePage = (n: string) => (/^\d+$/.test(n) ? Number(n) : NaN)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params
  const page = parsePage(n)
  return Number.isInteger(page) && page > 1 ? categoryMetadata(slug, page) : {}
}

export default async function CategoryPagedPage({ params }: Props) {
  const { slug, n } = await params
  const page = parsePage(n)
  if (page === 1) permanentRedirect(`/rubrique/${slug}`)
  if (!Number.isInteger(page) || page < 1) notFound()
  return <CategoryView slug={slug} page={page} />
}
