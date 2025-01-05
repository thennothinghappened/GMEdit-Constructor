
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
