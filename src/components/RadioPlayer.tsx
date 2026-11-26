'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type RadioItem = {
  id: number
  name: string
  streamUrl?: string | null
  logo?: string | null
}

type State = 'idle' | 'loading' | 'playing' | 'error'

type Ctx = {
  current: RadioItem | null
  state: State
  toggle: (radio: RadioItem) => void
  stop: () => void
}

const RadioContext = createContext<Ctx | null>(null)

export const useRadio = () => useContext(RadioContext)

/**
 * Lecteur radio unique, monté dans le layout : la lecture continue pendant la
 * navigation entre les pages, et une seule radio joue à la fois.
 */
export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<RadioItem | null>(null)
  const [state, setState] = useState<State>('idle')

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setState('idle')
    setCurrent(null)
  }, [])

  const toggle = useCallback(
    (radio: RadioItem) => {
      const audio = audioRef.current
      if (!audio || !radio.streamUrl) return
      if (current?.id === radio.id && state !== 'error') {
        stop()
        return
      }
      setCurrent(radio)
      setState('loading')
      audio.src = radio.streamUrl
      audio.play().catch(() => setState('error'))
    },
    [current, state, stop],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlaying = () => setState('playing')
    const onWaiting = () => setState('loading')
    const onError = () => setState((s) => (audio.getAttribute('src') ? 'error' : s))
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('error', onError)
    }
  }, [])

  // Écran verrouillé / centre de contrôle du téléphone : nom de la radio et bouton pause.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    const handle = (action: MediaSessionAction, fn: (() => void) | null) => {
      try {
        session.setActionHandler(action, fn)
      } catch {
        // action non prise en charge par ce navigateur
      }
    }
    if (!current) {
      session.metadata = null
      handle('pause', null)
      handle('stop', null)
      return
    }
    session.metadata = new MediaMetadata({
      title: current.name,
      artist: 'Ouragan Radios · En direct',
      artwork: current.logo ? [{ src: current.logo }] : [{ src: '/icon.png', sizes: '192x192' }],
    })
    handle('pause', stop)
    handle('stop', stop)
  }, [current, stop])

  return (
    <RadioContext.Provider value={{ current, state, toggle, stop }}>
      {children}
      <audio ref={audioRef} preload="none" />
      {current && <div className="radiobar-spacer" aria-hidden="true" />}
      {current && (
        <div className="radiobar" role="region" aria-label="Lecteur radio">
          <span className={`radiobar__dot radiobar__dot--${state}`} aria-hidden="true" />
          <span className="radiobar__name">
            {current.name}
            <small>
              {state === 'loading'
                ? 'Connexion…'
                : state === 'error'
                  ? 'Flux indisponible'
                  : 'En direct'}
            </small>
          </span>
          <button type="button" className="radiobar__stop" onClick={stop} aria-label="Arrêter la radio">
            ■
          </button>
        </div>
      )}
    </RadioContext.Provider>
  )
}
