
export type Falsy = false | 0 | '' | null | undefined;

export function isTruthy<T>(x: T | Falsy): x is T {
    return !!x;
}

export function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(x, max));
}

export function uuid() {
    return crypto.randomUUID();
}
