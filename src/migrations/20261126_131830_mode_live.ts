import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lives_status" AS ENUM('live', 'draft', 'ended');
  CREATE TABLE "lives" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"summary" varchar,
  	"cover_id" integer,
  	"status" "enum_lives_status" DEFAULT 'live' NOT NULL,
  	"category_id" integer,
  	"started_at" timestamp(3) with time zone,
  	"ended_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"live_id" integer NOT NULL,
  	"title" varchar,
  	"text" varchar NOT NULL,
  	"important" boolean DEFAULT false,
  	"image_id" integer,
  	"article_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lives_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "live_entries_id" integer;
  ALTER TABLE "lives" ADD CONSTRAINT "lives_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lives" ADD CONSTRAINT "lives_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_entries" ADD CONSTRAINT "live_entries_live_id_lives_id_fk" FOREIGN KEY ("live_id") REFERENCES "public"."lives"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_entries" ADD CONSTRAINT "live_entries_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_entries" ADD CONSTRAINT "live_entries_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "lives_cover_idx" ON "lives" USING btree ("cover_id");
  CREATE INDEX "lives_status_idx" ON "lives" USING btree ("status");
  CREATE INDEX "lives_category_idx" ON "lives" USING btree ("category_id");
  CREATE UNIQUE INDEX "lives_slug_idx" ON "lives" USING btree ("slug");
  CREATE INDEX "lives_updated_at_idx" ON "lives" USING btree ("updated_at");
  CREATE INDEX "lives_created_at_idx" ON "lives" USING btree ("created_at");
  CREATE INDEX "live_entries_live_idx" ON "live_entries" USING btree ("live_id");
  CREATE INDEX "live_entries_image_idx" ON "live_entries" USING btree ("image_id");
  CREATE INDEX "live_entries_article_idx" ON "live_entries" USING btree ("article_id");
  CREATE INDEX "live_entries_updated_at_idx" ON "live_entries" USING btree ("updated_at");
  CREATE INDEX "live_entries_created_at_idx" ON "live_entries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lives_fk" FOREIGN KEY ("lives_id") REFERENCES "public"."lives"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_entries_fk" FOREIGN KEY ("live_entries_id") REFERENCES "public"."live_entries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_lives_id_idx" ON "payload_locked_documents_rels" USING btree ("lives_id");
  CREATE INDEX "payload_locked_documents_rels_live_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("live_entries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "lives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "live_entries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "lives" CASCADE;
  DROP TABLE "live_entries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lives_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_live_entries_fk";
  
  DROP INDEX "payload_locked_documents_rels_lives_id_idx";
  DROP INDEX "payload_locked_documents_rels_live_entries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lives_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "live_entries_id";
  DROP TYPE "public"."enum_lives_status";`)
}
