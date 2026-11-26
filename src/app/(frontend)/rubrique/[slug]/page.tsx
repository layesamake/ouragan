import type { Metadata } from 'next'

import { CategoryView, categoryMetadata } from '../../../../components/CategoryView'

// Page mise en cache (ISR), régénérée au plus toutes les 60 s et dès qu'un contenu est publié.
export const revalidate = 60

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return categoryMetadata(slug)
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  return <CategoryView slug={slug} page={1} />
}
