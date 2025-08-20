
export declare global {
	namespace GM {
		/**
		 * A compilation job, representing a task being executed, most likely running the game :)
		 */
		interface Job {

			/**
			 * ID of this job, used to separate build directories so we can run in parallel.
			 */
			readonly id: number;
			
			/**
			 * The path to the build directory of the job.
			 */
			readonly buildPath: string;

			/**
			 * The platform the job is building for.
			 */
			readonly platform: GM.SupportedPlatform;

			/**
			 * The type of runtime being used.
			 */
			readonly runtimeType: GMS2.RuntimeType;

			/**
			 * The task the job is running.
			 */
			readonly task: GM.Task;

			/**
			 * The time the job started at.
			 */
			readonly startTime: Date;

			/**
			 * Events a job will emit during its execution.
			 */
			readonly events: EventEmitter<Job.EventMap>;

			/**
			 * Get the current state of the job.
			 */
			getState(): Job.State;

			/**
			 * Stop the job.
			 * 
			 * @returns Promise that resolves when the job has stopped.
			 */
			async stop(): Promise<Result<GM.Job.EventMap['stop']>>;

		};

		namespace Job {
			interface EventMap {
				stdout: string;
				output: string;
				stopping: void;
				stop: {
					stopType: StopType;
					exitCode?: number;
					errors: Error[];
				};
			};

			type StopType =
				'Failed'	|
				'Stopped'	|
				'Finished'	;

			type State = 
				{ status: 'running' }	|
				{ status: 'stopping' }	|
				{ status: 'stopped', stopType: StopType, exitCode?: number };

			/**
			 * A "descriptor" for an error type, which may be parsed from a Job's output.
			 */
			interface ErrorDescriptor {

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
			interface Error {

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
		};
	}
}
