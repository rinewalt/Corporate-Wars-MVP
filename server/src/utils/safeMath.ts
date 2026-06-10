export function clampMin(value: number, min = 0): number {
  return value < min ? min : value;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
