
export declare global {

	/**
	 * A "descriptor" for an error type, which may be parsed from a Job's output.
	 */
	interface JobErrorDescriptor {

		/**
		 * The regex used to match an error of this type.
		 */
		readonly regex: RegExp;

		/**
		 * Create a HTML representation of the given error that may be appended
		 * somewhere we want to display it.
		 */
		asHTML(groups: Record<string, string>): DocumentFragment;

		/**
		 * Get a meaningful string representation of the given error.
		 */
		asString(groups: Record<string, string>): string;

	};

	/**
	 * An error that occurred during the execution of a Job.
	 */
	interface JobError {

		/**
		 * The offset into the Job's output stream where this error occurred.
		 */
		readonly offset: number;

		/**
		 * The length of the error in the output stream.
		 */
		readonly length: number;

		/**
		 * Create a HTML representation of this error that may be appended
		 * somewhere we want to display it.
		 */
		asHTML(): DocumentFragment;

		/**
		 * Get a meaningful string representation of this error.
		 */
		toString(): string;

	}

}
