import * as migration_20261126_092349_initial from './20261126_092349_initial';
import * as migration_20261126_120313_storage_s3 from './20261126_120313_storage_s3';
import * as migration_20261126_121417_article_views from './20261126_121417_article_views';

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
    name: '20261126_121417_article_views'
  },
];
