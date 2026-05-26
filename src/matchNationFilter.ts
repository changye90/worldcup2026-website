import { matches } from './data';
import type { Match } from './matchTypes';
import { flagForTeam } from './teamFlags';
import teamFlagsData from '../functions/data/team-flags.json';

const teamFlagMap = teamFlagsData.teams as Record<string, string>;

const KNOCKOUT_PLACEHOLDER = /^\d|^[123][A-L]\b|^W\d+|^L\d+|^3[A-L/.]/i;

export function isNationalTeamName(name: string): boolean {
  const t = name.trim();
  if (!t || KNOCKOUT_PLACEHOLDER.test(t)) return false;
  return Object.prototype.hasOwnProperty.call(teamFlagMap, t);
}

export interface NationFilterOption {
  name: string;
  flag: string;
  matchCount: number;
}

/** All nations that appear on the schedule (home or away). */
export function scheduleNationOptions(): NationFilterOption[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const team of [m.homeTeam, m.awayTeam]) {
      if (!isNationalTeamName(team)) continue;
      counts.set(team, (counts.get(team) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, matchCount]) => ({
      name,
      flag: flagForTeam(name),
      matchCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function matchInvolvesNation(m: Match, nation: string): boolean {
  const n = nation.trim();
  if (!n) return true;
  return m.homeTeam === n || m.awayTeam === n;
}
