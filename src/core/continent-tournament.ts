import type { TournamentLike } from './tournament';

export interface Group {
  name: string;
  members: readonly string[];
}

/**
 * One qualifying round per group (continent): the first `advance` marbles of a round advance.
 * The finale is contested by everyone who advanced; its winner is the champion.
 */
export class ContinentTournament implements TournamentLike {
  readonly title = 'Qualified';
  private results: (readonly string[])[] = [];
  private championId: string | null = null;

  constructor(
    private readonly groups: readonly Group[],
    private readonly advance = 3,
  ) {
    if (groups.length === 0) throw new Error('A tournament needs at least one group');
  }

  get rounds(): number {
    return this.groups.length;
  }

  get round(): number {
    return this.results.length + 1;
  }

  get isFinale(): boolean {
    return this.results.length === this.rounds;
  }

  get champion(): string | null {
    return this.championId;
  }

  get isComplete(): boolean {
    return this.championId !== null;
  }

  get participants(): string[] {
    if (this.isFinale) return this.results.flat();
    return [...this.groups[this.results.length]!.members];
  }

  get advancing(): number {
    return this.isFinale ? 1 : Math.min(this.advance, this.participants.length);
  }

  get label(): string {
    return this.labelOf(this.round - 1);
  }

  labelOf(index: number): string {
    return index < this.rounds ? this.groups[index]!.name : 'Final';
  }

  qualifiersOf(index: number): readonly string[] {
    if (index < this.rounds) return this.results[index] ?? [];
    return this.championId ? [this.championId] : [];
  }

  recordResult(ranked: readonly string[]): void {
    if (this.isComplete) throw new Error('Tournament is already complete');
    const field = this.participants;
    if (ranked.length !== this.advancing) {
      throw new Error(`Expected ${this.advancing} marbles to advance, got ${ranked.length}`);
    }
    for (const id of ranked) {
      if (!field.includes(id)) throw new Error(`${id} is not in this round`);
    }
    if (new Set(ranked).size !== ranked.length) throw new Error('A marble cannot advance twice');
    if (this.isFinale) this.championId = ranked[0]!;
    else this.results.push([...ranked]);
  }
}
