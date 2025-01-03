
/**
 * Base error type we use to try and be descriptive to the user :)
 * @implements {IErr}
 */
export class Err extends Error {

	/**
	 * @param {string} message 
	 * @param {any?} [cause] 
	 * @param {string} [solution]
	 */
	constructor(message, cause = null, solution) {
		super(message, { cause });
		this.solution = solution;
	}

	/**
	 * @returns {string}
	 */
	toString() {

		let string = this.stack ?? JSON.stringify(this);

		if (this.cause !== null && this.cause !== undefined) {
			string += `\n\nCaused by ${this.cause}`;
		}
		
		return string;

	}

}
