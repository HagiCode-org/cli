import { createHash } from 'node:crypto';
import { loadSagaAssets, SAGA_METHOD_NAMES, type SagaAssets } from './assets';

export const METHOD_NAMES = SAGA_METHOD_NAMES;

export type MethodName = (typeof METHOD_NAMES)[number];

export type PublishedMethod = {
  name: MethodName;
  sha256: string;
  bytes: Buffer;
};

export function isMethodName(value: string): value is MethodName {
  return (METHOD_NAMES as readonly string[]).includes(value);
}

function digestOf(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Returns one published method from the installed package. Every bundled resource is verified first (see
 * `loadSagaAssets`), so a tampered package throws before any bytes leave this module.
 */
export function readMethod(name: MethodName, assets: SagaAssets = loadSagaAssets()): PublishedMethod {
  const bytes = assets.methods.get(name);
  if (!bytes) {
    throw new Error(`Saga method ${name} is missing from the verified bundle`);
  }
  return { name, sha256: digestOf(bytes), bytes };
}

/** SHA-256 of each published method, in `METHOD_NAMES` order, computed from the verified bundle bytes. */
export function methodDigests(assets: SagaAssets = loadSagaAssets()): Record<MethodName, string> {
  return Object.fromEntries(METHOD_NAMES.map(name => [name, readMethod(name, assets).sha256])) as Record<MethodName, string>;
}
