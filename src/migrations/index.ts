import * as migration_20261126_092349_initial from './20261126_092349_initial'
import * as migration_20261126_120313_storage_s3 from './20261126_120313_storage_s3'
import * as migration_20261126_121417_article_views from './20261126_121417_article_views'
import * as migration_20261126_124401_radios from './20261126_124401_radios'
import * as migration_20261126_131535_comments from './20261126_131535_comments'
import * as migration_20261126_131830_mode_live from './20261126_131830_mode_live'
import * as migration_20261126_153638_media_alt_facultatif from './20261126_153638_media_alt_facultatif'
import * as migration_20261126_154749_reseaux_sociaux from './20261126_154749_reseaux_sociaux'
import * as migration_20261126_173647_sources_articles from './20261126_173647_sources_articles'

export const migrations = [
  {
    up: migration_20261126_092349_initial.up,
    down: migration_20261126_092349_initial.down,
    name: '20261126_092349_initial',
  },
  {
    up: migration_20261126_120313_storage_s3.up,
    down: migration_20261126_120313_storage_s3.down,
    name: '20261126_120313_storage_s3',
  },
  {
    up: migration_20261126_121417_article_views.up,
    down: migration_20261126_121417_article_views.down,
    name: '20261126_121417_article_views',
  },
  {
    up: migration_20261126_124401_radios.up,
    down: migration_20261126_124401_radios.down,
    name: '20261126_124401_radios',
  },
  {
    up: migration_20261126_131535_comments.up,
    down: migration_20261126_131535_comments.down,
    name: '20261126_131535_comments',
  },
  {
    up: migration_20261126_131830_mode_live.up,
    down: migration_20261126_131830_mode_live.down,
    name: '20261126_131830_mode_live',
  },
  {
    up: migration_20261126_153638_media_alt_facultatif.up,
    down: migration_20261126_153638_media_alt_facultatif.down,
    name: '20261126_153638_media_alt_facultatif',
  },
  {
    up: migration_20261126_154749_reseaux_sociaux.up,
    down: migration_20261126_154749_reseaux_sociaux.down,
    name: '20261126_154749_reseaux_sociaux',
  },
  {
    up: migration_20261126_173647_sources_articles.up,
    down: migration_20261126_173647_sources_articles.down,
    name: '20261126_173647_sources_articles',
  },
]
