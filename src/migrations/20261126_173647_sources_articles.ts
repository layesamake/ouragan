import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ADD COLUMN "source_name" varchar;
  ALTER TABLE "articles" ADD COLUMN "source_url" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_source_name" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_source_url" varchar;
  CREATE INDEX "articles_source_url_idx" ON "articles" USING btree ("source_url");
  CREATE INDEX "_articles_v_version_version_source_url_idx" ON "_articles_v" USING btree ("version_source_url");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "articles_source_url_idx";
  DROP INDEX "_articles_v_version_version_source_url_idx";
  ALTER TABLE "articles" DROP COLUMN "source_name";
  ALTER TABLE "articles" DROP COLUMN "source_url";
  ALTER TABLE "_articles_v" DROP COLUMN "version_source_name";
  ALTER TABLE "_articles_v" DROP COLUMN "version_source_url";`)
}
