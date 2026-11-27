'use client'

import {
  FormSubmit,
  toast,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormFields,
  useFormModified,
  useHotkey,
  useOperation,
  useTranslation,
} from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

const URL_INPUT = '.file-field__remote-file'
const ADD_BUTTON = '.file-field__add-file'

/** Le formulaire de ce document (page ou fenêtre « Créer » ouverte depuis un article). */
const scopeOf = (el: HTMLElement | null): ParentNode =>
  el?.closest('form') || el?.closest('.drawer__content') || el?.closest('.doc-drawer') || document

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Bouton « Sauvegarder » de la médiathèque.
 *
 * Avec « Coller l'URL », Payload n'ajoute l'image qu'après un clic sur « Ajouter un fichier ».
 * Si on clique directement sur « Sauvegarder », le formulaire part sans fichier et le serveur
 * répond « Aucun fichier n'a été téléversé ». Ici :
 * - l'image est récupérée dès que le lien est collé (ou à la touche Entrée) ;
 * - si un lien est encore en attente au moment de sauvegarder, on le récupère d'abord.
 */
export function MediaSaveButton() {
  const { uploadStatus } = useDocumentInfo()
  const { submit } = useForm()
  const modified = useFormModified()
  const editDepth = useEditDepth()
  const operation = useOperation()
  const hasFile = useFormFields(([fields]) => Boolean(fields?.file?.value))
  const [busy, setBusy] = useState(false)
  const { t } = useTranslation()

  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const state = useRef({ hasFile, uploadStatus })
  useEffect(() => {
    state.current = { hasFile, uploadStatus }
  }, [hasFile, uploadStatus])

  // Récupère l'image dès que le lien est collé, ou quand on appuie sur Entrée.
  useEffect(() => {
    const root = scopeOf(wrapRef.current)
    const clickAdd = (input: HTMLInputElement) => {
      const btn = input.parentElement?.parentElement?.querySelector<HTMLButtonElement>(ADD_BUTTON)
      if (btn && input.value.trim()) btn.click()
    }
    const onPaste = (e: Event) => {
      const input = (e.target as HTMLElement)?.closest?.(URL_INPUT) as HTMLInputElement | null
      // Laisse React prendre en compte la valeur collée avant de cliquer.
      if (input) setTimeout(() => clickAdd(input), 50)
    }
    const onKeyDown = (e: Event) => {
      const input = (e.target as HTMLElement)?.closest?.(URL_INPUT) as HTMLInputElement | null
      if (input && (e as KeyboardEvent).key === 'Enter') {
        e.preventDefault()
        clickAdd(input)
      }
    }
    root.addEventListener('paste', onPaste, true)
    root.addEventListener('keydown', onKeyDown, true)
    return () => {
      root.removeEventListener('paste', onPaste, true)
      root.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  const save = async () => {
    if (busy || state.current.uploadStatus === 'uploading') return
    if (!state.current.hasFile) {
      const input = scopeOf(wrapRef.current).querySelector<HTMLInputElement>(URL_INPUT)
      const btn = input?.parentElement?.parentElement?.querySelector<HTMLButtonElement>(ADD_BUTTON)
      if (input?.value.trim() && btn) {
        setBusy(true)
        try {
          btn.click()
          // Attend que l'image soit téléchargée (20 s max côté serveur).
          for (let i = 0; i < 125 && !state.current.hasFile; i++) {
            await sleep(200)
            if (i > 5 && state.current.uploadStatus === 'failed') break
          }
        } finally {
          setBusy(false)
        }
        if (!state.current.hasFile) {
          toast.error(
            'Impossible de récupérer l’image à partir de ce lien. Vérifiez qu’il mène bien à une image, ou téléchargez-la puis choisissez le fichier.',
          )
          return
        }
        // Laisse le formulaire enregistrer le fichier avant l'envoi.
        await sleep(50)
      }
    }
    void submit()
  }

  const disabled = (operation === 'update' && !modified) || uploadStatus === 'uploading' || busy

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, (e) => {
    e.preventDefault()
    e.stopPropagation()
    buttonRef.current?.click()
  })

  return (
    <span ref={wrapRef} style={{ display: 'contents' }}>
      <FormSubmit
        buttonId="action-save"
        disabled={disabled}
        onClick={() => void save()}
        ref={buttonRef}
        size="medium"
        type="button"
      >
        {busy ? 'Récupération de l’image…' : t('general:save')}
      </FormSubmit>
    </span>
  )
}
