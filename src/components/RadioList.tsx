'use client'

import Image from 'next/image'

import { type RadioItem, useRadio } from './RadioPlayer'

type Props = { radios: (RadioItem & { liveUrl?: string | null })[] }

export function RadioList({ radios }: Props) {
  const player = useRadio()

  return (
    <ul className="radios">
      {radios.map((r) => {
        const isCurrent = player?.current?.id === r.id
        const playing = isCurrent && player?.state !== 'error'
        const label = playing ? `Arrêter ${r.name}` : `Écouter ${r.name} en direct`
        const art = r.logo ? (
          <Image src={r.logo} alt="" fill sizes="72px" />
        ) : (
          <span className="radio__initial" aria-hidden="true">
            {r.name.slice(0, 1)}
          </span>
        )
        const icon = (
          <span className={`radio__play${playing ? ' is-playing' : ''}`} aria-hidden="true">
            {playing ? '❚❚' : '▶'}
          </span>
        )

        return (
          <li key={r.id} className={`radio${isCurrent ? ' radio--current' : ''}`}>
            {r.streamUrl ? (
              <button
                type="button"
                className="radio__cover"
                onClick={() => player?.toggle(r)}
                aria-label={label}
                aria-pressed={playing}
              >
                {art}
                {icon}
              </button>
            ) : (
              <a
                className="radio__cover"
                href={r.liveUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${r.name} : ouvrir le direct (nouvel onglet)`}
              >
                {art}
                {icon}
              </a>
            )}
            <div className="radio__body">
              <span className="radio__name">{r.name}</span>
              <p className="radio__text">
                {isCurrent && player?.state === 'loading' ? (
                  'Connexion…'
                ) : isCurrent && player?.state === 'error' ? (
                  'Flux indisponible pour le moment'
                ) : (
                  <>
                    <strong>{playing ? 'En direct' : 'Écoutez'}</strong>{' '}
                    {r.streamUrl ? 'la radio en direct' : 'le direct sur son site'}
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
