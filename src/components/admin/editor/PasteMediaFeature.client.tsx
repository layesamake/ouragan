'use client'

import {
  $createBlockNode,
  $createUploadNode,
  $isUploadNode,
  createClientFeature,
} from '@payloadcms/richtext-lexical/client'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from '@payloadcms/richtext-lexical/lexical'
import { $insertNodeToNearestRoot } from '@payloadcms/richtext-lexical/lexical/utils'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { toast } from '@payloadcms/ui'
import { useEffect } from 'react'

import { getVideoEmbed } from '../../../lib/videoEmbed'

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

/** Insère un bloc (image, vidéo) à l'endroit du curseur, sur sa propre ligne. */
const insertBlock = (node: LexicalNode) => {
  const selection = $getSelection()
  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor.getNode()
    const paragraph = anchor.getTopLevelElement()
    $insertNodeToNearestRoot(node)
    // Si le curseur était sur une ligne vide, on la remplace par le bloc.
    if (paragraph && $isParagraphNode(paragraph) && paragraph.isEmpty() && paragraph.isAttached())
      paragraph.remove()
  } else {
    $getRoot().append(node, $createParagraphNode())
  }
}

/** Envoie une image collée dans la médiathèque, puis remplace l'aperçu par l'image enregistrée. */
async function uploadPastedImage(editor: LexicalEditor, file: File, formID: string) {
  const replacePending = (id?: number | string) =>
    editor.update(() => {
      const visit = (node: ReturnType<typeof $getRoot>) => {
        for (const child of node.getChildren()) {
          if (
            $isUploadNode(child) &&
            (child.getData() as { pending?: { formID?: string } })?.pending?.formID === formID
          ) {
            if (id === undefined) child.remove()
            else
              child.replace(
                $createUploadNode({
                  data: { id: randomId(), fields: {}, relationTo: 'media', value: id },
                }),
              )
          } else if ('getChildren' in child) visit(child as never)
        }
      }
      visit($getRoot())
    })

  try {
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
    const named =
      file.name && file.name !== 'image.png'
        ? file
        : new File(
            [file],
            `photo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`,
            {
              type: file.type,
            },
          )
    const body = new FormData()
    body.append('file', named)
    body.append('_payload', JSON.stringify({ alt: '' }))
    const res = await fetch('/api/media', { method: 'POST', body, credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    replacePending(json.doc.id)
    toast.success('Image ajoutée à l’article')
  } catch (err) {
    console.error('Envoi de l’image collée', err)
    replacePending(undefined)
    toast.error('L’image n’a pas pu être envoyée. Réessayez, ou utilisez le bouton « + » > Upload.')
  }
}

function PasteMediaPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!(event instanceof ClipboardEvent) || !event.clipboardData) return false
          const data = event.clipboardData

          // 1) Image(s) collée(s) : capture d'écran, « Copier l'image » depuis un site…
          const images = Array.from(data.files || []).filter((f) => f.type.startsWith('image/'))
          if (images.length) {
            event.preventDefault()
            const pending = images.map((file) => ({ file, formID: randomId() }))
            editor.update(() => {
              for (const { file, formID } of pending) {
                insertBlock(
                  $createUploadNode({
                    data: { pending: { formID, src: URL.createObjectURL(file) } } as never,
                  }),
                )
              }
            })
            for (const { file, formID } of pending) void uploadPastedImage(editor, file, formID)
            return true
          }

          // 2) Lien vidéo seul : devient un bloc « Vidéo » lu directement dans l'article.
          const text = data.getData('text/plain').trim()
          if (text && !/\s/.test(text) && getVideoEmbed(text)) {
            event.preventDefault()
            editor.update(() => {
              insertBlock(
                $createBlockNode({ id: randomId(), blockName: '', blockType: 'video', url: text }),
              )
            })
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  )

  return null
}

export const PasteMediaFeatureClient = createClientFeature({
  plugins: [{ Component: PasteMediaPlugin, position: 'normal' }],
})
