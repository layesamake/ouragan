import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "radios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"stream_url" varchar,
  	"live_url" varchar,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "radios_id" integer;
  ALTER TABLE "radios" ADD CONSTRAINT "radios_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "radios_logo_idx" ON "radios" USING btree ("logo_id");
  CREATE INDEX "radios_updated_at_idx" ON "radios" USING btree ("updated_at");
  CREATE INDEX "radios_created_at_idx" ON "radios" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_radios_fk" FOREIGN KEY ("radios_id") REFERENCES "public"."radios"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_radios_id_idx" ON "payload_locked_documents_rels" USING btree ("radios_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "radios" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "radios" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_radios_fk";
  
  DROP INDEX "payload_locked_documents_rels_radios_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "radios_id";`)
}
