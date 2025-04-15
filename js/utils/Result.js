
/**
 * Unsafely unwrap a result type. Only to be used in the case that we definitely know more than
 * intellisense does.
 * 
 * @template T
 * @template E
 * @param {Result<T, E>} result 
 * @returns {T}
 */
export function unwrap(result) {
	// @ts-expect-error We're deliberately bypassing a type check.
	return result.data;
}

/**
 * Produce an `Ok` result given some data.
 * 
 * @template T
 * @param {T} data 
 * @returns {Ok<T>}
 */
export function Ok(data) {
	// @ts-expect-error `void` isn't a real type and it can't hurt you.
	return { ok: true, data };
}

/**
 * Produce an `Err` result given some error result.
 * 
 * @template E
 * @param {E} err 
 * @returns {Err<E>}
 */
export function Err(err) {
	return { ok: false, err };
}
