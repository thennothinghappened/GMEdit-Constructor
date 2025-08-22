
export function assertOk<T>(result: Result<T, any>): asserts result is Ok<T>;
export function assertErr<E>(result: Result<any, E>): asserts result is Err<E>;
