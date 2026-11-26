import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'

import { getVideoEmbed } from '../lib/videoEmbed'
import { VideoEmbed } from './VideoEmbed'

type Node = SerializedLexicalNode & {
  children?: Node[]
  text?: string
  fields?: { url?: string }
}

/** Un paragraphe qui ne contient qu'un lien vidéo est affiché comme un lecteur. */
const videoUrlOfParagraph = (node: Node): string | null => {
  const kids = (node.children || []).filter((c) => !(c.type === 'text' && !c.text?.trim()))
  if (kids.length !== 1) return null
  const only = kids[0]
  if (only.type === 'text') return getVideoEmbed(only.text) ? only.text!.trim() : null
  if (only.type === 'link' || only.type === 'autolink') {
    const url = only.fields?.url
    return url && getVideoEmbed(url) ? url : null
  }
  return null
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: (args) => {
    const url = videoUrlOfParagraph(args.node as Node)
    if (url) return <VideoEmbed url={url} />
    const fallback = defaultConverters.paragraph
    return typeof fallback === 'function' ? fallback(args) : null
  },
  blocks: {
    ...defaultConverters.blocks,
    video: ({ node }: { node: { fields: { url?: string; caption?: string | null } } }) =>
      node.fields.url ? <VideoEmbed url={node.fields.url} caption={node.fields.caption} /> : null,
  },
})

/** Texte de l'article, avec vidéos et images intégrées. */
export function ArticleBody({ data }: { data: SerializedEditorState }) {
  return <RichText data={data} converters={converters} className="prose" />
}
