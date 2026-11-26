import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import type { Payload } from 'payload'

import {
  ADMIN,
  NEW_ARTICLE_URL,
  NEW_MEDIA_URL,
  PENDING_COMMENTS_URL,
  categoryName,
  editArticleURL,
  formatNumber,
  formatShort,
  getDashboardData,
  isScheduled,
} from './stats'

type Props = {
  payload: Payload
  user?: { name?: string | null; email?: string | null } | null
}

const greeting = () => {
  const h = new Date().getUTCHours() // Dakar = UTC
  return h < 18 ? 'Bonjour' : 'Bonsoir'
}

/** Page d'accueil de l'administration : actions rapides et chiffres du jour. */
export async function Dashboard({ payload, user }: Props) {
  const [data, lives] = await Promise.all([
    getDashboardData(payload),
    payload.find({
      collection: 'lives',
      where: { status: { equals: 'live' } },
      sort: '-startedAt',
      limit: 5,
      depth: 0,
    }),
  ])
  const firstName = (user?.name || '').split(' ')[0]
  const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Dakar',
  }).format(new Date())

  return (
    <Gutter className="ouragan-dash">
      <header className="ouragan-dash__hello">
        <div>
          <h1>
            {greeting()}
            {firstName ? ` ${firstName}` : ''} 👋
          </h1>
          <p className="ouragan-dash__date">{todayLabel}</p>
        </div>
      </header>

      {lives.docs.length > 0 && (
        <section className="ouragan-live-now" aria-label="Directs en cours">
          {lives.docs.map((l) => (
            <Link
              key={l.id}
              href={`${ADMIN}/collections/lives/${l.id}`}
              className="ouragan-live-now__item"
            >
              <span className="ouragan-badge ouragan-badge--live">En direct</span>
              <strong>{l.title}</strong>
              <span>Publier un message →</span>
            </Link>
          ))}
        </section>
      )}

      <div className="ouragan-dash__actions">
        <Link href={NEW_ARTICLE_URL} className="ouragan-action ouragan-action--primary">
          <span aria-hidden="true">✍️</span> Nouvel article
        </Link>
        <Link href={`${ADMIN}/collections/lives/create`} className="ouragan-action">
          <span aria-hidden="true">🔴</span> Lancer un direct
        </Link>
        <Link href={NEW_MEDIA_URL} className="ouragan-action">
          <span aria-hidden="true">📷</span> Ajouter une photo
        </Link>
        <Link
          href={PENDING_COMMENTS_URL}
          className={`ouragan-action${data.pendingComments > 0 ? ' ouragan-action--alert' : ''}`}
        >
          <span aria-hidden="true">💬</span>{' '}
          {data.pendingComments > 0
            ? `${formatNumber(data.pendingComments)} commentaire${data.pendingComments > 1 ? 's' : ''} à valider`
            : 'Commentaires'}
        </Link>
        <a href="/" target="_blank" rel="noopener noreferrer" className="ouragan-action">
          <span aria-hidden="true">🌐</span> Voir le site
        </a>
      </div>

      <section className="ouragan-tiles" aria-label="Chiffres">
        <div className="ouragan-tile">
          <span className="ouragan-tile__value">{formatNumber(data.publishedToday)}</span>
          <span className="ouragan-tile__label">publié(s) aujourd’hui</span>
        </div>
        <div className="ouragan-tile">
          <span className="ouragan-tile__value">{formatNumber(data.publishedWeek)}</span>
          <span className="ouragan-tile__label">sur 7 jours</span>
        </div>
        <div className="ouragan-tile">
          <span className="ouragan-tile__value">{formatNumber(data.totalViews)}</span>
          <span className="ouragan-tile__label">lectures au total</span>
        </div>
        <Link
          href={`${ADMIN}/collections/articles?where[_status][equals]=draft`}
          className="ouragan-tile ouragan-tile--link"
        >
          <span className="ouragan-tile__value">{formatNumber(data.drafts)}</span>
          <span className="ouragan-tile__label">brouillon(s)</span>
        </Link>
      </section>

      <div className="ouragan-dash__grid">
        <section className="ouragan-card">
          <h2>📝 Mes brouillons</h2>
          {data.recentDrafts.length === 0 ? (
            <p className="ouragan-empty">Aucun brouillon en cours.</p>
          ) : (
            <ul className="ouragan-list">
              {data.recentDrafts.map((a) => (
                <li key={a.id}>
                  <Link href={editArticleURL(a.id)}>{a.title || 'Sans titre'}</Link>
                  <span className="ouragan-meta">
                    {categoryName(a.category)}
                    {a.updatedAt && ` · modifié le ${formatShort(a.updatedAt)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ouragan-card">
          <h2>🔥 Les plus lus</h2>
          {data.mostRead.length === 0 ? (
            <p className="ouragan-empty">
              Les lectures s’afficheront ici dès les premières visites.
            </p>
          ) : (
            <ol className="ouragan-list ouragan-list--ranked">
              {data.mostRead.map((a) => (
                <li key={a.id}>
                  <Link href={editArticleURL(a.id)}>{a.title}</Link>
                  <span className="ouragan-meta">{formatNumber(a.views || 0)} lectures</span>
                </li>
              ))}
            </ol>
          )}
          <Link href={`${ADMIN}/statistiques`} className="ouragan-more">
            Toutes les statistiques →
          </Link>
        </section>

        <section className="ouragan-card ouragan-card--wide">
          <h2>📰 Dernières publications</h2>
          {data.latest.length === 0 ? (
            <p className="ouragan-empty">
              Pas encore d’article publié. <Link href={NEW_ARTICLE_URL}>Écrire le premier →</Link>
            </p>
          ) : (
            <ul className="ouragan-list">
              {data.latest.map((a) => {
                const scheduled = isScheduled(a.publishedAt)
                return (
                  <li key={a.id}>
                    <Link href={editArticleURL(a.id)}>{a.title}</Link>
                    <span className="ouragan-meta">
                      {scheduled && (
                        <span className="ouragan-badge ouragan-badge--scheduled">Programmé</span>
                      )}
                      {a.featured && <span className="ouragan-badge">À la une</span>}
                      {a.breaking && (
                        <span className="ouragan-badge ouragan-badge--live">Flash</span>
                      )}
                      {categoryName(a.category)} · {formatShort(a.publishedAt)} ·{' '}
                      {formatNumber(a.views || 0)} lectures ·{' '}
                      {!scheduled && (
                        <a href={`/article/${a.slug}`} target="_blank" rel="noopener noreferrer">
                          voir
                        </a>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </Gutter>
  )
}
