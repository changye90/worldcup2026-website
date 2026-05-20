import type { Lang } from './i18n';

type L = Record<Lang, string>;

export const outrightWinnerRows: {
  rank: number;
  flag: string;
  country: L;
  decimalOdds: number;
  impliedPct: number;
}[] = [
  { rank: 1, flag: '🇪🇸', country: { en: 'Spain', es: 'España', pt: 'Espanha' }, decimalOdds: 5.5, impliedPct: 18.2 },
  { rank: 2, flag: '🇫🇷', country: { en: 'France', es: 'Francia', pt: 'França' }, decimalOdds: 5.5, impliedPct: 18.2 },
  { rank: 3, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: { en: 'England', es: 'Inglaterra', pt: 'Inglaterra' }, decimalOdds: 6.5, impliedPct: 15.4 },
  { rank: 4, flag: '🇧🇷', country: { en: 'Brazil', es: 'Brasil', pt: 'Brasil' }, decimalOdds: 9.0, impliedPct: 11.1 },
  { rank: 5, flag: '🇦🇷', country: { en: 'Argentina', es: 'Argentina', pt: 'Argentina' }, decimalOdds: 9.5, impliedPct: 10.5 },
  { rank: 6, flag: '🇵🇹', country: { en: 'Portugal', es: 'Portugal', pt: 'Portugal' }, decimalOdds: 12.0, impliedPct: 8.3 },
  { rank: 7, flag: '🇩🇪', country: { en: 'Germany', es: 'Alemania', pt: 'Alemanha' }, decimalOdds: 13.0, impliedPct: 7.7 },
  { rank: 8, flag: '🇳🇱', country: { en: 'Netherlands', es: 'Países Bajos', pt: 'Países Baixos' }, decimalOdds: 21.0, impliedPct: 4.8 },
  { rank: 9, flag: '🇳🇴', country: { en: 'Norway', es: 'Noruega', pt: 'Noruega' }, decimalOdds: 31.0, impliedPct: 3.2 },
  { rank: 10, flag: '🇧🇪', country: { en: 'Belgium', es: 'Bélgica', pt: 'Bélgica' }, decimalOdds: 36.0, impliedPct: 2.8 },
  { rank: 11, flag: '🇨🇴', country: { en: 'Colombia', es: 'Colombia', pt: 'Colômbia' }, decimalOdds: 41.0, impliedPct: 2.4 },
  { rank: 12, flag: '🇲🇦', country: { en: 'Morocco', es: 'Marruecos', pt: 'Marrocos' }, decimalOdds: 51.0, impliedPct: 2.0 },
  { rank: 13, flag: '🇯🇵', country: { en: 'Japan', es: 'Japón', pt: 'Japão' }, decimalOdds: 51.0, impliedPct: 2.0 },
  { rank: 14, flag: '🇺🇸', country: { en: 'USA', es: 'EE. UU.', pt: 'EUA' }, decimalOdds: 61.0, impliedPct: 1.6 },
  { rank: 15, flag: '🇺🇾', country: { en: 'Uruguay', es: 'Uruguay', pt: 'Uruguai' }, decimalOdds: 66.0, impliedPct: 1.5 },
  { rank: 16, flag: '🇲🇽', country: { en: 'Mexico', es: 'México', pt: 'México' }, decimalOdds: 76.0, impliedPct: 1.3 },
  { rank: 17, flag: '🇨🇭', country: { en: 'Switzerland', es: 'Suiza', pt: 'Suíça' }, decimalOdds: 81.0, impliedPct: 1.2 },
  { rank: 18, flag: '🇭🇷', country: { en: 'Croatia', es: 'Croacia', pt: 'Croácia' }, decimalOdds: 81.0, impliedPct: 1.2 },
  { rank: 19, flag: '🇪🇨', country: { en: 'Ecuador', es: 'Ecuador', pt: 'Equador' }, decimalOdds: 91.0, impliedPct: 1.1 },
  { rank: 20, flag: '🇸🇪', country: { en: 'Sweden', es: 'Suecia', pt: 'Suécia' }, decimalOdds: 101.0, impliedPct: 1.0 },
];

export type TeamWithFlag = L & { flag: string };

export type GroupQualifyRow = {
  groupLetter: string;
  teams: TeamWithFlag[];
  winGroupOdds: [number, number, number, number];
  qualifyOdds: [number, number, number, number];
};

export const groupQualifyRows: GroupQualifyRow[] = [
  {
    groupLetter: 'A',
    teams: [
      { flag: '🇲🇽', en: 'Mexico', es: 'México', pt: 'México' },
      { flag: '🇨🇿', en: 'Czechia', es: 'Chequia', pt: 'Chéquia' },
      { flag: '🇰🇷', en: 'South Korea', es: 'Corea del Sur', pt: 'Coreia do Sul' },
      { flag: '🇿🇦', en: 'South Africa', es: 'Sudáfrica', pt: 'África do Sul' },
    ],
    winGroupOdds: [1.83, 3.4, 4.3, 8.5],
    qualifyOdds: [1.15, 1.5, 1.85, 2.8],
  },
  {
    groupLetter: 'B',
    teams: [
      { flag: '🇨🇭', en: 'Switzerland', es: 'Suiza', pt: 'Suíça' },
      { flag: '🇨🇦', en: 'Canada', es: 'Canadá', pt: 'Canadá' },
      { flag: '🇧🇦', en: 'Bosnia & Herzegovina', es: 'Bosnia y Herzegovina', pt: 'Bósnia e Herzegovina' },
      { flag: '🇶🇦', en: 'Qatar', es: 'Catar', pt: 'Catar' },
    ],
    winGroupOdds: [2.0, 3.1, 4.5, 23.0],
    qualifyOdds: [1.2, 1.55, 1.9, 6.5],
  },
  {
    groupLetter: 'C',
    teams: [
      { flag: '🇧🇷', en: 'Brazil', es: 'Brasil', pt: 'Brasil' },
      { flag: '🇲🇦', en: 'Morocco', es: 'Marruecos', pt: 'Marrocos' },
      { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', en: 'Scotland', es: 'Escocia', pt: 'Escócia' },
      { flag: '🇭🇹', en: 'Haiti', es: 'Haití', pt: 'Haiti' },
    ],
    winGroupOdds: [1.35, 5.5, 11.0, 101.0],
    qualifyOdds: [1.08, 1.45, 2.5, 15.0],
  },
  {
    groupLetter: 'D',
    teams: [
      { flag: '🇺🇸', en: 'USA', es: 'EE. UU.', pt: 'EUA' },
      { flag: '🇹🇷', en: 'Turkey', es: 'Turquía', pt: 'Turquia' },
      { flag: '🇵🇾', en: 'Paraguay', es: 'Paraguay', pt: 'Paraguai' },
      { flag: '🇦🇺', en: 'Australia', es: 'Australia', pt: 'Austrália' },
    ],
    winGroupOdds: [2.05, 3.3, 4.1, 11.0],
    qualifyOdds: [1.22, 1.6, 1.8, 3.0],
  },
  {
    groupLetter: 'E',
    teams: [
      { flag: '🇩🇪', en: 'Germany', es: 'Alemania', pt: 'Alemanha' },
      { flag: '🇪🇨', en: 'Ecuador', es: 'Ecuador', pt: 'Equador' },
      { flag: '🇨🇮', en: "Côte d'Ivoire", es: 'Costa de Marfil', pt: 'Costa do Marfim' },
      { flag: '🇨🇼', en: 'Curaçao', es: 'Curazao', pt: 'Curaçao' },
    ],
    winGroupOdds: [1.47, 4.1, 6.0, 101.0],
    qualifyOdds: [1.12, 1.5, 1.8, 9.0],
  },
  {
    groupLetter: 'F',
    teams: [
      { flag: '🇳🇱', en: 'Netherlands', es: 'Países Bajos', pt: 'Países Baixos' },
      { flag: '🇯🇵', en: 'Japan', es: 'Japón', pt: 'Japão' },
      { flag: '🇸🇪', en: 'Sweden', es: 'Suecia', pt: 'Suécia' },
      { flag: '🇹🇳', en: 'Tunisia', es: 'Túnez', pt: 'Tunísia' },
    ],
    winGroupOdds: [1.83, 3.6, 5.0, 13.0],
    qualifyOdds: [1.2, 1.65, 1.9, 3.5],
  },
  {
    groupLetter: 'G',
    teams: [
      { flag: '🇧🇪', en: 'Belgium', es: 'Bélgica', pt: 'Bélgica' },
      { flag: '🇪🇬', en: 'Egypt', es: 'Egipto', pt: 'Egito' },
      { flag: '🇮🇷', en: 'Iran', es: 'Irán', pt: 'Irã' },
      { flag: '🇳🇿', en: 'New Zealand', es: 'Nueva Zelanda', pt: 'Nova Zelândia' },
    ],
    winGroupOdds: [1.4, 5.9, 7.0, 23.0],
    qualifyOdds: [1.1, 1.7, 2.0, 6.0],
  },
  {
    groupLetter: 'H',
    teams: [
      { flag: '🇪🇸', en: 'Spain', es: 'España', pt: 'Espanha' },
      { flag: '🇺🇾', en: 'Uruguay', es: 'Uruguay', pt: 'Uruguai' },
      { flag: '🇸🇦', en: 'Saudi Arabia', es: 'Arabia Saudita', pt: 'Arábia Saudita' },
      { flag: '🇨🇻', en: 'Cape Verde', es: 'Cabo Verde', pt: 'Cabo Verde' },
    ],
    winGroupOdds: [1.32, 5.0, 20.0, 56.0],
    qualifyOdds: [1.05, 1.4, 4.5, 10.0],
  },
  {
    groupLetter: 'I',
    teams: [
      { flag: '🇫🇷', en: 'France', es: 'Francia', pt: 'França' },
      { flag: '🇳🇴', en: 'Norway', es: 'Noruega', pt: 'Noruega' },
      { flag: '🇸🇳', en: 'Senegal', es: 'Senegal', pt: 'Senegal' },
      { flag: '🇮🇶', en: 'Iraq', es: 'Irak', pt: 'Iraque' },
    ],
    winGroupOdds: [1.55, 3.5, 8.5, 46.0],
    qualifyOdds: [1.1, 1.8, 2.0, 12.0],
  },
  {
    groupLetter: 'J',
    teams: [
      { flag: '🇦🇷', en: 'Argentina', es: 'Argentina', pt: 'Argentina' },
      { flag: '🇦🇹', en: 'Austria', es: 'Austria', pt: 'Áustria' },
      { flag: '🇩🇿', en: 'Algeria', es: 'Argelia', pt: 'Argélia' },
      { flag: '🇯🇴', en: 'Jordan', es: 'Jordania', pt: 'Jordânia' },
    ],
    winGroupOdds: [1.4, 5.0, 8.0, 56.0],
    qualifyOdds: [1.08, 1.6, 2.1, 11.0],
  },
  {
    groupLetter: 'K',
    teams: [
      { flag: '🇵🇹', en: 'Portugal', es: 'Portugal', pt: 'Portugal' },
      { flag: '🇨🇴', en: 'Colombia', es: 'Colombia', pt: 'Colômbia' },
      { flag: '🇨🇩', en: 'DR Congo', es: 'RD Congo', pt: 'RD Congo' },
      { flag: '🇺🇿', en: 'Uzbekistan', es: 'Uzbekistán', pt: 'Uzbequistão' },
    ],
    winGroupOdds: [1.55, 3.1, 14.0, 23.0],
    qualifyOdds: [1.1, 1.45, 3.5, 5.0],
  },
  {
    groupLetter: 'L',
    teams: [
      { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', en: 'England', es: 'Inglaterra', pt: 'Inglaterra' },
      { flag: '🇭🇷', en: 'Croatia', es: 'Croacia', pt: 'Croácia' },
      { flag: '🇬🇭', en: 'Ghana', es: 'Ghana', pt: 'Gana' },
      { flag: '🇵🇦', en: 'Panama', es: 'Panamá', pt: 'Panamá' },
    ],
    winGroupOdds: [1.41, 5.0, 11.0, 23.0],
    qualifyOdds: [1.05, 1.25, 2.1, 3.25],
  },
];
