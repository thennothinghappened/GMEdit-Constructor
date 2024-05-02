
/**
 * Assign the given `target` object to include the properties of the source, while respecting
 * nested objects, unlike `Object.assign()`.
 * 
 * @param {Record<string|number, any>} target The object being assigned.
 * @param {Record<string|number, any>} source The object from which to copy properties from.
 * @returns {Record<string|number, any>}
 */
export function deep_assign(target, source) {

	for (const key of Object.keys(source)) {

		if ((target[key] instanceof Object) && (source[key] instanceof Object)) {
			deep_assign(target[key], source[key]);
		} else {
			target[key] = source[key];
		}

	}

	return target;
}
