import { CliUsageError } from './errors';

/** A Hero reference as the session creation requests carry it: exactly one of `heroId` or `heroName`. */
export type HeroReference = { heroId: string } | { heroName: string };

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The one rule for a `--hero <name-or-id>` value, shared by every command that takes it. Surrounding whitespace is ignored.
 * A GUID (any letter case) is a Hero ID; any other nonblank value is a Hero name. A blank value is a usage error.
 * The CLI never asks the backend which field to use.
 */
export function parseHeroReference(value: string, flag = '--hero'): HeroReference {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new CliUsageError(`${flag} needs a nonblank Hero name or ID.`);
  }

  return GUID_PATTERN.test(trimmed) ? { heroId: trimmed } : { heroName: trimmed };
}
