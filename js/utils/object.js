/**
 * @param {any} to
 * @param {any} obj
 * @returns {any}
 */
export function deep_assign(to, obj) {
	if (!(obj instanceof Object) || !(to instanceof Object)) return to;
	for (const key of Object.keys(obj)) {
		if (to[key] instanceof Object) {
			deep_assign(to[key], obj[key]);
		} else {
			to[key] = obj[key];
		}
	}
	return to;
}