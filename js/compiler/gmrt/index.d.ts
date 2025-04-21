
export declare global {
	namespace GMRT {

		type CliArgs = {
			
			/**
			 * List of input file paths to be processed.
			 */
			inputFiles: NonEmptyArray<string>;

			/**
			 * Path to the build graph to use.
			 */
			buildGraphPath: string;

			/**
			 * Sequence of jobs IDs in that build graph to execute.
			 */
			buildGraphJobIds: NonEmptyArray<string>;

			/**
			 * This doesn't seem to ever be not "Release", at least in the GMRT builds that are
			 * public.
			 */
			buildType: 'Release';

			/**
			 * How many jobs can run in parallel.
			 */
			parallelJobs?: number;
			
			/**
			 * Directory to place output files in.
			 */
			outputDirectory: string;
			
			/**
			 * Temporary working directory.
			 */
			tempDirectory?: string;

			/**
			 * How verbose the output should be.
			 */
			verbosity?: 'normal' | 'verbose' | 'very-verbose';

		};

	};
};
