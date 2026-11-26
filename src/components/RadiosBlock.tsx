import { asMedia, imageUrl } from '../lib/format'
import { getRadios } from '../lib/queries'
import { RadioList } from './RadioList'

/** Bloc « Ouragan Radios » de la colonne latérale. */
export async function RadiosBlock() {
  const radios = (await getRadios()).filter((r) => r.streamUrl || r.liveUrl)
  if (radios.length === 0) return null

  return (
    <section className="widget widget--radios" aria-labelledby="radios-title">
      <h2 id="radios-title" className="widget__title">
        Ouragan Radios
      </h2>
      <RadioList
        radios={radios.map((r) => ({
          id: r.id,
          name: r.name,
          streamUrl: r.streamUrl,
          liveUrl: r.liveUrl,
          logo: imageUrl(asMedia(r.logo), 'thumbnail'),
        }))}
      />
    </section>
  )
}
