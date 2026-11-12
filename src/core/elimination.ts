/** Pure game rules – no Phaser dependency so they are trivially unit-testable. */
export class EliminationTracker {
  private alive: Set<string>;
  private order: string[] = [];
  private finishers: string[] = [];
  private readonly total: number;

  /** `survivors` marbles are left when the round is decided (more than one for qualifying rounds). */
  constructor(
    ids: string[],
    private readonly survivors = 1,
  ) {
    this.alive = new Set(ids);
    this.total = this.alive.size;
  }

  eliminate(id: string): void {
    if (this.alive.delete(id)) this.order.push(id);
  }

  /** Marks a marble that is still in play as having finished; the first to finish is the best. */
  markFinished(id: string): void {
    if (this.alive.has(id) && !this.finishers.includes(id)) this.finishers.push(id);
  }

  get remaining(): string[] {
    return [...this.alive];
  }

  /** Winner exists once exactly one marble is left. */
  get winner(): string | null {
    return this.alive.size === 1 ? [...this.alive][0]! : null;
  }

  /** The round is decided once no more marbles are left than may survive. */
  get decided(): boolean {
    return this.alive.size <= this.survivors;
  }

  /** The marbles still in play when the round is decided, best first. */
  get standings(): string[] {
    const rank = (id: string) => {
      const i = this.finishers.indexOf(id);
      return i < 0 ? Infinity : i;
    };
    return [...this.alive].sort((a, b) => rank(a) - rank(b));
  }

  /** Final standing: the first one out is last, the winner is 1st. Null while still in play. */
  placeOf(id: string): number | null {
    const index = this.order.indexOf(id);
    if (index >= 0) return this.total - index;
    if (!this.alive.has(id) || !this.decided) return null;
    return this.standings.indexOf(id) + 1;
  }

  /** Eliminated marbles, first-out first. */
  get eliminationOrder(): readonly string[] {
    return this.order;
  }
}
