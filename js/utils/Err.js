
/**
 * Base error type we use to try and be descriptive to the user :)
 * @implements {IErr}
 */
export class Err extends Error {

	/**
	 * @param {string} message 
	 * @param {unknown} [cause] 
	 * @param {string} [solution]
	 */
	constructor(message, cause, solution) {
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

/**
 * The program has entered an invalid state.
 * 
 * This error should not be recovered from!
 */
export class InvalidStateErr extends Err {

	/**
	 * @param {string} message
	 * @param {unknown} [cause]
	 */
	constructor(message, cause) {
		super(
			'Invalid State!!: ' + message,
			cause,
			'Please report this error through Constructor\'s GitHub Issues (https://github.com/thennothinghappened/GMEdit-Constructor/issues)!'
		);
	}

}
