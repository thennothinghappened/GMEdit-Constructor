import { Err } from './Err.js';

/**
 * @returns {never}
 */
export function abstract() {
	throw new Err('This method was declared as abstract and cannot be called directly.');
}
