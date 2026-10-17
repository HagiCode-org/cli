import { CliUsageError } from '../../runtime/errors';
import { loadStructuredJson } from '../../runtime/inputLoader';

/**
 * Loads a nested request body from `--input <file>` or `--input -` and rejects anything that is not
 * a JSON object. The check runs locally, so malformed input never reaches the backend.
 */
export async function readJsonObjectInput<T extends object>(source: string, label: string): Promise<T> {
  const loaded = await loadStructuredJson<unknown>(source);
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new CliUsageError(`${label} must be a JSON object.`);
  }

  return loaded as T;
}
