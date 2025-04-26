
/**
 * Delay asynchronous execution a number of milliseconds.
 * 
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
export function delay(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}
