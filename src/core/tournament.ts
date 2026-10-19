/**
 * Pure tournament rules – no Phaser dependency.
 *
 * `rounds` qualifying rounds are played with the whole pool, minus the winners of the
 * previous rounds (round 1 = 50 flags, round 2 = 49, ...). Each round winner advances to
 * the finale, which is contested by the round winners only.
 */
export class Tournament {
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

  /** Records the winner of the current round (or the champion in the finale). */
  recordWinner(id: string): void {
    if (this.isComplete) throw new Error('Tournament is already complete');
    if (!this.participants.includes(id)) throw new Error(`${id} is not in this round`);
    if (this.isFinale) this.championId = id;
    else this.winnersList.push(id);
  }
}
