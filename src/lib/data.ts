import { resolve } from 'node:path';
import { loadAll, type DataSet } from './loader';

const dataRoot = resolve(process.cwd(), 'src/data');

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
