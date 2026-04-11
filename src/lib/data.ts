import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, type DataSet } from './loader';

const here = fileURLToPath(new URL('.', import.meta.url));
const dataRoot = resolve(here, '../data');

let cache: DataSet | null = null;

export async function getDataSet(): Promise<DataSet> {
  if (cache) return cache;
  cache = await loadAll(dataRoot);
  return cache;
}
