import { randomUUID } from 'node:crypto'

import type { Article } from '../payload-types'

/** Bloc de texte renvoyé par l'IA. */
export type ContentBlock = { type: 'paragraph' | 'heading'; text: string }

type LexicalContent = NonNullable<Article['content']>
type LexicalNode = LexicalContent['root']['children'][number]

const textNode = (text: string, format = 0): LexicalNode => ({
  type: 'text',
  version: 1,
  text,
  detail: 0,
  format, // 0 = normal, 1 = gras, 2 = italique
  mode: 'normal',
  style: '',
})

const elementBase = { direction: 'ltr' as const, format: '' as const, indent: 0 }

const paragraphNode = (children: LexicalNode[]): LexicalNode => ({
  type: 'paragraph',
  version: 1,
  ...elementBase,
  textFormat: 0,
  textStyle: '',
  children,
})

const headingNode = (text: string): LexicalNode => ({
  type: 'heading',
  version: 1,
  tag: 'h2',
  ...elementBase,
  children: [textNode(text)],
})

const linkNode = (url: string, text: string): LexicalNode => ({
  type: 'link',
  version: 3,
  id: randomUUID(),
  ...elementBase,
  fields: { linkType: 'custom', url, newTab: true },
  children: [textNode(text)],
})

/** Nettoie un texte : espaces, éventuel balisage Markdown laissé par l'IA. */
const clean = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .replace(/^#+\s*/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .trim()

/**
 * Transforme les blocs de l'IA en contenu Lexical (éditeur de Payload),
 * avec en dernière ligne « Source : <média> » et le lien vers l'article d'origine.
 */
export function blocksToLexical(
  blocks: ContentBlock[],
  source?: { name: string; url: string },
): LexicalContent {
  const children: LexicalNode[] = []
  for (const block of blocks) {
    const text = clean(block.text || '')
    if (!text) continue
    children.push(block.type === 'heading' ? headingNode(text) : paragraphNode([textNode(text)]))
  }
  if (source) {
    children.push(paragraphNode([textNode('Source : ', 2), linkNode(source.url, source.name)]))
  }
  return {
    root: { type: 'root', version: 1, ...elementBase, children },
  }
}
