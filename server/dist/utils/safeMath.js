export function clampMin(value, min = 0) {
    return value < min ? min : value;
}
export function round2(value) {
    return Math.round(value * 100) / 100;
}
