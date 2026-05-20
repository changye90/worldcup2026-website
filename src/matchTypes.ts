export type MatchStage = 'group' | 'knockout';

/** Tournament phase for labels (group + each knockout round). */
export type MatchPhase =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export interface Match {
  id: number;
  date: string;
  kickoffTime: string;
  city: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  flag1: string;
  flag2: string;
  matchNumber: number;
  stage: MatchStage;
  phase: MatchPhase;
}
