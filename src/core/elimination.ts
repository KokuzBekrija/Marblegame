/** Pure game rules – no Phaser dependency so they are trivially unit-testable. */
export class EliminationTracker {
  private alive: Set<string>;
  private order: string[] = [];
  private readonly total: number;

  constructor(ids: string[]) {
    this.alive = new Set(ids);
    this.total = this.alive.size;
  }

  eliminate(id: string): void {
    if (this.alive.delete(id)) this.order.push(id);
  }

  get remaining(): string[] {
    return [...this.alive];
  }

  /** Winner exists once exactly one marble is left. */
  get winner(): string | null {
    return this.alive.size === 1 ? [...this.alive][0]! : null;
  }

  /** Final standing: the first one out is last, the winner is 1st. Null while still in play. */
  placeOf(id: string): number | null {
    const index = this.order.indexOf(id);
    if (index >= 0) return this.total - index;
    return this.winner === id ? 1 : null;
  }

  /** Eliminated marbles, first-out first. */
  get eliminationOrder(): readonly string[] {
    return this.order;
  }
}
