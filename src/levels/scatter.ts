/** Fixed pseudo-random number in [-1, 1) from two integers: the same layout on every start. */
export function scatter(a: number, b: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}
