import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, type DataSet } from './loader';

const here = fileURLToPath(new URL('.', import.meta.url));
const dataRoot = resolve(here, '../data');

let cache: DataSet | null = null;
let pending: Promise<DataSet> | null = null;

export async function getDataSet(): Promise<DataSet> {
  if (cache) return cache;
  if (pending) return pending;
  pending = loadAll(dataRoot).then(
    (data) => {
      cache = data;
      pending = null;
      return data;
    },
    (err) => {
      // Don't poison the cache on failure — let callers retry.
      pending = null;
      throw err;
    },
  );
  return pending;
}
