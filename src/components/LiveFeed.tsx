'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { formatTime } from '../lib/format'
import type { Feed, FeedEntry } from '../lib/liveFeed'

const POLL_MS = 10_000
const URL_RE = /(https?:\/\/[^\s]+)/g

/** Texte brut du rédacteur : paragraphes et liens cliquables. */
function RichLines({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>
            {p.split('\n').map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line.split(URL_RE).map((part, k) =>
                  k % 2 === 1 ? (
                    <a key={k} href={part} target="_blank" rel="noopener noreferrer nofollow">
                      {part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </Fragment>
            ))}
          </p>
        ))}
    </>
  )
}

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('fr-SN', { dateStyle: 'full', timeZone: 'Africa/Dakar' }).format(
    new Date(iso),
  )

function Entry({ entry, fresh }: { entry: FeedEntry; fresh: boolean }) {
  return (
    <li
      id={`m${entry.id}`}
      className={`live-entry${entry.important ? ' live-entry--key' : ''}${fresh ? ' live-entry--fresh' : ''}`}
    >
      <time className="live-entry__time" dateTime={entry.createdAt}>
        {formatTime(entry.createdAt)}
      </time>
      <div className="live-entry__body">
        {entry.important && <span className="live-entry__badge">Moment clé</span>}
        {entry.title && <h3 className="live-entry__title">{entry.title}</h3>}
        <div className="live-entry__text">
          <RichLines text={entry.text} />
        </div>
        {entry.image && (
          <figure className="live-entry__image">
            <Image
              src={entry.image.src}
              alt={entry.image.alt}
              width={entry.image.width}
              height={entry.image.height}
              sizes="(min-width: 1024px) 640px, 100vw"
            />
            {entry.image.alt && <figcaption>{entry.image.alt}</figcaption>}
          </figure>
        )}
        {entry.article && (
          <Link className="live-entry__article" href={`/article/${entry.article.slug}`}>
            → Lire : {entry.article.title}
          </Link>
        )}
      </div>
    </li>
  )
}

/**
 * Fil du direct. La page arrive avec les derniers messages ; ensuite le navigateur
 * interroge /direct/<slug>/flux toutes les 10 s (seulement quand l'onglet est visible)
 * et ajoute les nouveaux messages en haut, sans recharger la page.
 */
export function LiveFeed({
  slug,
  initial,
  hasMore: initialHasMore,
}: {
  slug: string
  initial: Feed
  hasMore: boolean
}) {
  const [entries, setEntries] = useState(initial.entries)
  const [status, setStatus] = useState(initial.status)
  const [fresh, setFresh] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState(0)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)
  const seen = useRef(new Set(initial.entries.map((e) => e.id)))
  const baseTitle = useRef('')

  const isAway = () => {
    const top = listRef.current?.getBoundingClientRect().top ?? 0
    return top < -200
  }

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/direct/${encodeURIComponent(slug)}/flux`, { cache: 'no-store' })
      if (!res.ok) return
      const feed = (await res.json()) as Feed
      setStatus(feed.status)
      const newIds = feed.entries.filter((e) => !seen.current.has(e.id)).map((e) => e.id)
      newIds.forEach((id) => seen.current.add(id))
      setEntries((prev) => {
        // Les messages du flux remplacent les plus récents (modifs, suppressions) ;
        // les plus anciens déjà chargés sont conservés.
        const minId = Math.min(...feed.entries.map((e) => e.id))
        const older = feed.entries.length ? prev.filter((e) => e.id < minId) : []
        return [...feed.entries, ...older]
      })
      if (newIds.length) {
        setFresh(new Set(newIds))
        if (isAway() || document.hidden) setPending((n) => n + newIds.length)
      }
    } catch {
      // réseau coupé : on réessaiera au prochain tour
    }
  }, [slug])

  useEffect(() => {
    if (status !== 'live') return
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
      clearInterval(timer)
      timer = setInterval(poll, POLL_MS)
    }
    const onVisibility = () => {
      if (document.hidden) clearInterval(timer)
      else {
        poll()
        start()
      }
    }
    // Premier passage tout de suite : la page en cache peut dater de quelques secondes.
    const first = setTimeout(poll, 0)
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, poll])

  // Nombre de nouveaux messages non lus dans le titre de l'onglet : « (3) … ».
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title
    document.title = pending ? `(${pending}) ${baseTitle.current}` : baseTitle.current
  }, [pending])

  useEffect(() => {
    const clear = () => {
      if (!document.hidden && !isAway()) setPending(0)
    }
    window.addEventListener('scroll', clear, { passive: true })
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('scroll', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [])

  const loadMore = async () => {
    const last = entries[entries.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/direct/${encodeURIComponent(slug)}/flux?before=${last.id}`)
      const data = (await res.json()) as { entries: FeedEntry[]; hasMore: boolean }
      data.entries.forEach((e) => seen.current.add(e.id))
      setEntries((prev) => [...prev, ...data.entries.filter((e) => e.id < last.id)])
      setHasMore(data.hasMore)
    } catch {
      // ignoré
    } finally {
      setLoadingMore(false)
    }
  }

  const goTop = () => {
    setPending(0)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Séparateur de date quand le direct s'étale sur plusieurs jours.
  const dayBreaks = new Set(
    entries
      .filter((e, i) => i > 0 && dayKey(e.createdAt) !== dayKey(entries[i - 1].createdAt))
      .map((e) => e.id),
  )

  return (
    <section className="live-feed" aria-label="Messages du direct">
      <p className={`live-feed__status live-feed__status--${status}`} role="status">
        {status === 'live' ? (
          <>
            <span className="dot" aria-hidden="true" /> Mise à jour automatique
          </>
        ) : (
          'Ce direct est terminé.'
        )}
      </p>

      {pending > 0 && (
        <button type="button" className="live-feed__new" onClick={goTop}>
          ↑ {pending} nouveau{pending > 1 ? 'x' : ''} message{pending > 1 ? 's' : ''}
        </button>
      )}

      {entries.length === 0 ? (
        <p className="live-feed__empty">Le direct va commencer. Restez connectés !</p>
      ) : (
        <ol className="live-feed__list" ref={listRef}>
          {entries.map((e) => {
            return (
              <Fragment key={e.id}>
                {dayBreaks.has(e.id) && (
                  <li className="live-feed__day" aria-hidden="true">
                    {dayKey(e.createdAt)}
                  </li>
                )}
                <Entry entry={e} fresh={fresh.has(e.id)} />
              </Fragment>
            )
          })}
        </ol>
      )}

      {hasMore && (
        <button type="button" className="live-feed__more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Chargement…' : 'Voir les messages précédents'}
        </button>
      )}
    </section>
  )
}
