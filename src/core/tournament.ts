/** What a game scene needs to know about the tournament it plays; see `Tournament` and `ContinentTournament`. */
export interface TournamentLike {
  /** Heading of the list of qualifiers. */
  readonly title: string;
  /** Number of qualifying rounds; the finale comes after them. */
  readonly rounds: number;
  /** 1-based round number; `rounds + 1` is the finale. */
  readonly round: number;
  readonly isFinale: boolean;
  readonly isComplete: boolean;
  readonly champion: string | null;
  /** Flags that compete in the current round. */
  readonly participants: string[];
  /** How many marbles advance from the current round (1 in the finale). */
  readonly advancing: number;
  /** Status line text for the current round. */
  readonly label: string;
  labelOf(index: number): string;
  qualifiersOf(index: number): readonly string[];
  recordResult(ranked: readonly string[]): void;
}

/**
 * Pure tournament rules – no Phaser dependency.
 *
 * `rounds` qualifying rounds are played with the whole pool, minus the winners of the
 * previous rounds (round 1 = the whole pool, round 2 = one fewer, ...). Each round winner advances to
 * the finale, which is contested by the round winners only.
 */
export class Tournament implements TournamentLike {
  readonly title = 'Round winners';
  readonly advancing = 1;
  private winnersList: string[] = [];
  private championId: string | null = null;

  constructor(
    private readonly pool: readonly string[],
    readonly rounds = 5,
  ) {
    if (new Set(pool).size !== pool.length) throw new Error('Pool contains duplicates');
    if (pool.length <= rounds) throw new Error('Pool must be larger than the number of rounds');
  }

  /** Winners of the qualifying rounds, in round order. */
  get winners(): readonly string[] {
    return this.winnersList;
  }

  /** 1-based round number; `rounds + 1` is the finale. */
  get round(): number {
    return this.winnersList.length + 1;
  }

  get isFinale(): boolean {
    return this.winnersList.length === this.rounds;
  }

  get champion(): string | null {
    return this.championId;
  }

  get isComplete(): boolean {
    return this.championId !== null;
  }

  /** Flags that compete in the current round. */
  get participants(): string[] {
    if (this.isFinale) return [...this.winnersList];
    return this.pool.filter((id) => !this.winnersList.includes(id));
  }

  /** Status line text: "Round 2/5" or "Final". */
  get label(): string {
    return this.isFinale ? 'Final' : `Round ${this.round}/${this.rounds}`;
  }

  /** Name of round `index` (0-based; `rounds` is the finale). */
  labelOf(index: number): string {
    return index < this.rounds ? `Round ${index + 1}` : 'Final';
  }

  /** The marbles that advanced from round `index`; empty until it has been played. */
  qualifiersOf(index: number): readonly string[] {
    const id = index < this.rounds ? this.winnersList[index] : this.championId;
    return id ? [id] : [];
  }

  /** Records the result of the current round: the marbles that advance, best first. */
  recordResult(ranked: readonly string[]): void {
    const winner = ranked[0];
    if (winner === undefined) throw new Error('A round needs a winner');
    this.recordWinner(winner);
  }

  /** Records the winner of the current round (or the champion in the finale). */
  recordWinner(id: string): void {
    if (this.isComplete) throw new Error('Tournament is already complete');
    if (!this.participants.includes(id)) throw new Error(`${id} is not in this round`);
    if (this.isFinale) this.championId = id;
    else this.winnersList.push(id);
  }
}
