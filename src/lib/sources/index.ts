/*
 * Barrel for the source fetchers, split by domain into sibling files. Importers
 * keep using `from '../lib/sources'`. `ghHeaders` stays internal to the folder.
 */

export { normalizeUrl, safeHttpUrl } from './http';
export * from './github';
export * from './npm';
export * from './frameworks';
export * from './favicon';
export * from './discord';
export * from './translate';
export * from './thumbnail';
