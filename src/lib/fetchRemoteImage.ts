import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

import type { PayloadHandler } from 'payload'

/** Plages d'adresses internes interdites (protection SSRF). */
const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6')

const MAX_BYTES = 10 * 1024 * 1024

async function assertPublicHost(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocole')
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('port')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true })
  if (!addresses.length) throw new Error('dns')
  for (const { address, family } of addresses) {
    if (blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')) throw new Error('adresse interne')
  }
}

/**
 * GET /api/media/paste-url?src=… — remplace l'endpoint de Payload utilisé par le bouton
 * « Coller une URL » de la médiathèque. Le navigateur ne peut pas télécharger lui-même
 * une image d'un autre site (CORS) : le serveur la récupère, en refusant les adresses internes.
 */
export const pasteImageFromURL: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ message: 'Non connecté.' }, { status: 401 })
  const src = req.searchParams.get('src') || ''
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return Response.json({ message: 'Lien invalide.' }, { status: 400 })
  }

  try {
    let response: Response | null = null
    for (let hop = 0; hop <= 3; hop++) {
      await assertPublicHost(url)
      response = await fetch(url, {
        redirect: 'manual',
        headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0 (compatible; OuraganBot/1.0)' },
        signal: AbortSignal.timeout(20_000),
      })
      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url)
        continue
      }
      break
    }
    if (!response || !response.ok) throw new Error(`HTTP ${response?.status}`)
    const type = (response.headers.get('content-type') || '').split(';')[0].trim()
    if (!type.startsWith('image/')) {
      return Response.json({ message: 'Ce lien ne mène pas à une image.' }, { status: 400 })
    }
    const length = Number(response.headers.get('content-length') || 0)
    if (length > MAX_BYTES) {
      return Response.json({ message: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    }
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ message: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    }
    return new Response(buffer, {
      headers: { 'Content-Type': type, 'Content-Length': String(buffer.byteLength) },
    })
  } catch (err) {
    req.payload.logger.warn(`paste-url ${src} : ${(err as Error).message}`)
    return Response.json({ message: 'Impossible de récupérer cette image.' }, { status: 400 })
  }
}
