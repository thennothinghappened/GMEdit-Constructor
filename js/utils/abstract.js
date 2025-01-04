import { Err } from './Err.js';

/**
 * @param {...unknown} _ Any parameters to prevent being marked as unused.
 * @returns {never}
 */
export function abstract(..._) {
	throw new Err('This method was declared as abstract and cannot be called directly.');
}
