import type { PCode_Application_Contracts_Dto_HeroDto } from '../generated/api/models/PCode_Application_Contracts_Dto_HeroDto';

/** One Hero a chat can run with, as `hagi hero list --json` prints it. */
export interface HeroListItem {
  heroId: string;
  name: string;
  executorType: string;
}

/**
 * A Hero a chat can bind to: enabled, and neither built in nor read only. This is the rule the backend applies when a chat
 * names a Hero, so a listed Hero is one that `--hero` accepts.
 */
export function isBindableHero(hero: PCode_Application_Contracts_Dto_HeroDto): boolean {
  return hero.isEnabled === true && hero.isBuiltIn !== true && hero.isReadOnly !== true;
}

export function toHeroListItems(heroes: PCode_Application_Contracts_Dto_HeroDto[]): HeroListItem[] {
  return heroes
    .filter(isBindableHero)
    .map(hero => ({
      heroId: hero.id ?? '',
      name: hero.name,
      executorType: String(hero.executorType ?? ''),
    }));
}

export function formatHeroListHuman(items: HeroListItem[]): string {
  if (items.length === 0) {
    return 'No Hero can run a chat right now.\n';
  }

  const lines = items.map(item => `${item.name}  ${item.heroId}  ${item.executorType}`);
  return `${lines.join('\n')}\n`;
}
