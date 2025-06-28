declare module 'poker-odds' {
  export interface HandChance {
    name: string;
    count: number;
  }

  export interface EquityResult {
    hand: string[];
    count: number;
    wins: number;
    ties: number;
    handChances: HandChance[];
    favourite: boolean;
  }

  export function calculateEquity(
    hands: string[][],
    board: string[],
    iterations?: number,
    exhaustive?: boolean
  ): EquityResult[];
} 