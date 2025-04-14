
/**
 * The "no object" singleton.
 */
export const None = Object.freeze({});

/**
 * @template T
 * @param {T} data 
 * @returns {Option<T>}
 */
export function Some(data) {
    return { data };
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
