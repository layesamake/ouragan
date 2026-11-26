import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { editArticleURL, formatNumber, getStatsData } from './stats'

/** Page « Statistiques » de l'administration (/admin/statistiques). */
export async function Statistics({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult
  const { i18n, payload, user } = req
  if (!user) return null
  const data = await getStatsData(payload)
  const maxDay = Math.max(1, ...data.days.map((d) => d.count))
  const maxCatViews = Math.max(1, ...data.byCategory.map((c) => c.views))

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <Gutter className="ouragan-dash ouragan-stats">
        <SetStepNav nav={[{ label: 'Statistiques' }]} />
        <header className="ouragan-dash__hello">
          <h1>📊 Statistiques</h1>
        </header>

        <section className="ouragan-tiles" aria-label="Chiffres">
          <div className="ouragan-tile">
            <span className="ouragan-tile__value">{formatNumber(data.totalPublished)}</span>
            <span className="ouragan-tile__label">articles en ligne</span>
          </div>
          <div className="ouragan-tile">
            <span className="ouragan-tile__value">{formatNumber(data.totalViews)}</span>
            <span className="ouragan-tile__label">lectures au total</span>
          </div>
          <div className="ouragan-tile">
            <span className="ouragan-tile__value">
              {formatNumber(
                data.totalPublished ? Math.round(data.totalViews / data.totalPublished) : 0,
              )}
            </span>
            <span className="ouragan-tile__label">lectures par article</span>
          </div>
          <div className="ouragan-tile">
            <span className="ouragan-tile__value">{formatNumber(data.scheduled)}</span>
            <span className="ouragan-tile__label">programmé(s)</span>
          </div>
        </section>

        <div className="ouragan-dash__grid">
          <section className="ouragan-card">
            <h2>Articles publiés (14 derniers jours)</h2>
            <div className="ouragan-bars">
              {data.days.map((d) => (
                <div key={d.label} className="ouragan-bars__col" title={`${d.label} : ${d.count}`}>
                  <span className="ouragan-bars__value">{d.count || ''}</span>
                  <span
                    className="ouragan-bars__bar"
                    style={{ height: `${(d.count / maxDay) * 100}%` }}
                  />
                  <span className="ouragan-bars__label">{d.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ouragan-card">
            <h2>Par rubrique</h2>
            <ul className="ouragan-cats">
              {data.byCategory.map((c) => (
                <li key={c.id}>
                  <div className="ouragan-cats__row">
                    <strong>{c.name}</strong>
                    <span className="ouragan-meta">
                      {formatNumber(c.count)} article{c.count > 1 ? 's' : ''} ·{' '}
                      {formatNumber(c.views)} lectures
                    </span>
                  </div>
                  <span className="ouragan-cats__track">
                    <span
                      className="ouragan-cats__fill"
                      style={{ width: `${(c.views / maxCatViews) * 100}%`, background: c.color }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="ouragan-card ouragan-card--wide">
            <h2>🔥 Les 20 articles les plus lus</h2>
            {data.top.length === 0 ? (
              <p className="ouragan-empty">Aucun article publié pour l’instant.</p>
            ) : (
              <ol className="ouragan-list ouragan-list--ranked">
                {data.top.map((a) => (
                  <li key={a.id}>
                    <Link href={editArticleURL(a.id)}>{a.title}</Link>
                    <span className="ouragan-meta">{formatNumber(a.views || 0)} lectures</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
