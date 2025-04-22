import { docString } from './StringUtils.js';

/**
 * Base error type we use to try and be descriptive to the user :)
 */
export class BaseError extends Error {

	/**
	 * @type {unknown}
	 */
	cause;

	/**
	 * @param {string} message 
	 * @param {unknown} [cause]
	 */
	constructor(message, cause) {
		super(message);
		this.cause = cause;
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
 * An error with a potential solution to show to the user.
 * @implements {ISolvableError}
 */
export class SolvableError extends BaseError {

	/**
	 * @param {string} message 
	 * @param {string} solution
	 * @param {unknown} [cause]
	 */
	constructor(message, solution, cause) {
		super(message, cause);
		this.solution = solution;
	}

}

/**
 * The program has entered an invalid state.
 * 
 * This error should not be recovered from!
 */
export class InvalidStateErr extends BaseError {

	/**
	 * @param {string} message
	 * @param {unknown} [cause]
	 */
	constructor(message, cause) {
		super(
			docString(`
				Invalid State!!: ${message}

				Please report this error through Constructor\'s GitHub Issues
				(https://github.com/thennothinghappened/GMEdit-Constructor/issues)!
			`),
			cause
		);
	}

}
