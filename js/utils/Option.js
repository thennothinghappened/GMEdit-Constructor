
/**
 * The "no object" singleton.
 */
export const None = Object.freeze({ __noneMarker: undefined });

/**
 * @template T
 * @param {T} data 
 * @returns {Option<T>}
 */
export function Some(data) {
	return { data };
}

/**
 * Convert a non-nullable type or `undefined` into `Some(data)` or `None`
 * respectively.
 * 
 * @template {Object} T
 * @param {T|undefined} maybeData 
 */
export function mapToOption(maybeData) {
	if (maybeData === undefined) {
		return None;
	}
	return Some(maybeData);
}

/**
 * Flatten Ok option values, and discard None values. To be used with `Array#flatMap()` to convert
 * `Option<T>[]` into `T[]`.
 * 
 * @template T
 * @param {Option<T>} option
 * @returns {[T]|[]}
 */
export function flattenOptionArray(option) {
	if (isSome(option)) {
		return [option.data];
	}

	return [];
}

/**
 * Check whether the given option contains a value.
 * 
 * @template T
 * @param {Option<T>} option
 * @returns {option is Some<T>}
 */
export function isSome(option) {
	return option !== None;
}

/**
 * Check whether the given option does not contain a value.
 * 
 * @template T
 * @param {Option<T>} option
 * @returns {option is None}
 */
export function isNone(option) {
	return option === None;
}
