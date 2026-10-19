/** Pure game rules – no Phaser dependency so they are trivially unit-testable. */
export class EliminationTracker {
  private alive: Set<string>;
  private order: string[] = [];

  constructor(ids: string[]) {
    this.alive = new Set(ids);
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

  /** Eliminated marbles, first-out first. */
  get eliminationOrder(): readonly string[] {
    return this.order;
  }
}
