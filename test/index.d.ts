
export function assertOk<T>(result: Result<T, unknown>): asserts result is Ok<T>;
export function assertErr<E>(result: Result<unknown, E>): asserts result is Err<E>;
