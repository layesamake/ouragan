import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Recherche du site : colonne « texte de recherche » des articles (titre + chapô + texte,
 * en minuscules et sans accents), remplie ici pour les articles existants à partir des nœuds
 * « text » de leur contenu Lexical, puis tenue à jour à chaque enregistrement par un hook.
 */
const fill = (title: string, excerpt: string, content: string) => `
  lower(translate(
    concat_ws(' ', ${title}, ${excerpt}, (
      SELECT string_agg(t #>> '{}', ' ')
      FROM jsonb_path_query(${content}, 'strict $.**.text') AS t
      WHERE jsonb_typeof(t) = 'string'
    )),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ’‘',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUYY'''''
  ))`

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_text" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_search_text" varchar;`)
  await db.execute(
    sql.raw(`UPDATE "articles" SET "search_text" = ${fill('"title"', '"excerpt"', '"content"')};`),
  )
  await db.execute(
    sql.raw(
      `UPDATE "_articles_v" SET "version_search_text" = ${fill(
        '"version_title"',
        '"version_excerpt"',
        '"version_content"',
      )} WHERE "latest" = true;`,
    ),
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "articles" DROP COLUMN "search_text";
  ALTER TABLE "_articles_v" DROP COLUMN "version_search_text";`)
}
