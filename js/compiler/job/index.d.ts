
export declare global {

	interface JobEventMap {
		stdout: string;
		output: string;
		stopping: void;
		stop: {
			stopType: JobStopType;
			exitCode?: number;
			errors: JobError[];
		};
	};

	type JobStopType =
		'Failed'	|
		'Stopped'	|
		'Finished'	;

	type JobState = 
		{ status: 'running' }	|
		{ status: 'stopping' }	|
		{ status: 'stopped', stopType: JobStopType, exitCode?: number };

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
		asHTML(groups: Record<string, string>): Node;

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
		asHTML(): Node;

	}

}
