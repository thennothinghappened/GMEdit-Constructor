
/**
 * Return the given array as a definitely non-empty array, or `undefined` if the constraint does
 * not hold.
 * 
 * @template T
 * @param {readonly T[]} array
 * @returns {NonEmptyArray<T>|undefined}
 */
export function asNonEmptyArray(array) {

	if (array.length >= 1) {
		// @ts-expect-error Casting based on above size >= 1.
		return array;
	}

	return undefined;

}
