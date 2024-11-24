
export declare global {

	/**
	 * Base error type we use to try and be descriptive to the user :)
	 */
	interface IErr extends Error {

		readonly title?: string;
		readonly solution?: string;

		stackFormat(): string;

		toString(): string;

	}

};
