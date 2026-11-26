import * as migration_20261126_092349_initial from './20261126_092349_initial';
import * as migration_20261126_120313_storage_s3 from './20261126_120313_storage_s3';

export const migrations = [
  {
    up: migration_20261126_092349_initial.up,
    down: migration_20261126_092349_initial.down,
    name: '20261126_092349_initial',
  },
  {
    up: migration_20261126_120313_storage_s3.up,
    down: migration_20261126_120313_storage_s3.down,
    name: '20261126_120313_storage_s3'
  },
];
