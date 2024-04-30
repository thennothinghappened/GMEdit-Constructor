/**
 * @param {any} obj
 * @returns {boolean}
 */
export function is_object(obj) {
    return obj && obj instanceof Object;
}

/**
 * @param {any} to
 * @param {any} obj
 * @returns {any}
 */
export function deep_assign(to, obj) {
	if (!is_object(obj) || !is_object(to)) return to;
	for (const key of Object.keys(obj)) {
		if (is_object(to[key])) {
			deep_assign(to[key], obj[key]);
		} else {
			to[key] = obj[key];
		}
	}
	return to;
}