import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { ensureDefaultCategories } from './lib/defaultCategories'
import { migrations } from './migrations'
import { Articles } from './collections/Articles'
import { Authors } from './collections/Authors'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL || 'file:./ouragan.db'

// DATABASE_URL commençant par "file:" => SQLite (développement local),
// sinon PostgreSQL (production).
const db = databaseUrl.startsWith('file:')
  ? sqliteAdapter({ client: { url: databaseUrl } })
  : postgresAdapter({
      pool: { connectionString: databaseUrl },
      migrationDir: path.resolve(dirname, 'migrations'),
      // En production, les migrations s'appliquent automatiquement au démarrage.
      prodMigrations: migrations,
    })

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Ouragan.sn',
    },
  },
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  collections: [Articles, Categories, Authors, Media, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  // Au démarrage : si aucune rubrique n'existe encore, crée les 6 rubriques du site.
  onInit: async (payload) => {
    const { totalDocs } = await payload.count({ collection: 'categories' })
    if (totalDocs === 0) await ensureDefaultCategories(payload)
  },
  plugins: [
    // Images stockées dans Supabase Storage (compatible S3) quand S3_BUCKET est défini ;
    // sinon, sur le disque local (dossier /media), pratique en développement.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: { media: true },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'eu-west-3',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
