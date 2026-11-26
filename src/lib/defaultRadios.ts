import type { Payload } from 'payload'

/**
 * Radios créées au premier démarrage. Seuls les liens vérifiés (domaine officiel
 * de la radio) sont pré-remplis ; les autres sont désactivées tant que le
 * rédacteur n'a pas saisi leur flux dans l'admin.
 */
export const DEFAULT_RADIOS = [
  { name: 'RFM', liveUrl: 'https://www.igfm.sn/rfm-live', active: true },
  { name: 'Sud FM', active: false },
  { name: 'iRadio', active: false },
  { name: 'Zik FM', active: false },
  { name: 'Touba FM', active: false },
  { name: 'Dakar Musique', streamUrl: 'https://stream.dakarmusique.com/', active: true },
]

export const ensureDefaultRadios = async (payload: Payload): Promise<void> => {
  const { totalDocs } = await payload.count({ collection: 'radios' })
  if (totalDocs > 0) return
  for (const [i, r] of DEFAULT_RADIOS.entries()) {
    await payload.create({ collection: 'radios', data: { ...r, order: i + 1 } })
  }
  payload.logger.info('Radios par défaut créées')
}
