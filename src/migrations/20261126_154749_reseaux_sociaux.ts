import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "social_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"youtube" varchar DEFAULT 'https://www.youtube.com/@ouragan_sn',
  	"facebook" varchar DEFAULT 'https://www.facebook.com/share/19vupAgc72/',
  	"instagram" varchar,
  	"x" varchar,
  	"tiktok" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "social_links" CASCADE;`)
}
