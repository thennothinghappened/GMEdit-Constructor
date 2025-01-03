
export declare global {

	/**
	 * Representation of a version of a GM runtime.
	 */
	interface IRuntimeVersion {

		readonly year: number;
		readonly month: number;
		readonly major: number;
		readonly build: number;

		/**
		 * The expected YY format this runtime requires.
		 */
		readonly format: YYProjectFormat;

		/**
		 * What type of runtime this is.
		 */
		readonly type: GMChannelType;

		/**
		 * Returns a negative number if this runtime is older than `other`, 0 for same, or postive for newer.
		 */
		compare(other: IRuntimeVersion): number;

		/**
		 * Returns whether this runtime version is supported by Constructor.
		 */
		supported(): Result<void>;

		/**
		 * Returns whether this runtime version is supported by a given project.
		 * 
		 * Projects on 2023.11 and earlier use a different format to 2024.2 and greater
		 * as per [Prefabs Phase 1](https://github.com/YoYoGames/GameMaker-Bugs/issues/3218).
		 */
		supportedByProject(project: GMEdit.Project): Result<boolean>;

	}

	/**
	 * Information for a specific found runtime.
	 */
	type RuntimeInfo = {
		version: IRuntimeVersion;
		path: string;
		igor_path: string;
	};

	/**
	 * Information for a specific found user.
	 */
	type UserInfo = {
		path: string;
		name: string;
	};

	type GMChannelType = 
		'Stable'	|
		'Beta'		|
		'LTS'		;

	type RuntimeBuildType =
		'VM'	|
		'YYC'	;

	/**
	 * Settings for running an Igor Job.
	 */
	type IgorSettings = {

		/**
		 * Which platform the action will run for.
		 */
		platform: IgorPlatform;

		/**
		 * The Igor action to run.
		 */
		verb: IgorVerb;

		/**
		 * Which runner to use - default is VM.
		 */
		runner: RuntimeBuildType;

		/**
		 * How many threads to use for this compilation.
		 */
		threads: number;

		/**
		 * Name of the Build Config to use for this compilation.
		 */
		configName: string;

		/**
		 * Path to the user folder. Required for packaging.
		 */
		userFolder?: string;

		/**
		 * The path to the directory to output build files to.
		 */
		buildPath: string;

		/**
		 * Launch the executable on the target device after building;
		 * same as the "Create Executable and Launch" option in the IDE
		 */
		launch?: boolean;

	}

	/**
	 * A supported platform for Igor to target.
	 */
	type IgorPlatform =
		'OperaGX'			|
		'Windows'			|
		'Mac'				|
		'Linux'				|
		'HTML5'				|
		'ios'				|
		'Android'			|
		'tvos'				|
		'ps4'				|
		'ps5'				|
		'XBoxOne'			|
		'XBoxOneSeriesXS'	|
		'Switch'			;

	/**
	 * Host (OS) platform information for Igor.
	 */
	type IgorPlatformInfo = {

		/** Extension of the `Igor` executable for the target platform's runtime. */
		platform_executable_extension: string;

		/** Platform-specific path segment of the `Igor` executable. */
		platform_path_name: string;

		/** {@link IgorPlatform} to native build for the host OS. */
		user_platform: IgorPlatform;

		/**
		 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
		 * to find runtimes.
		 * 
		 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
		 * as I don't know where the location is for Linux.
		 */
		default_runtime_paths: {
			[key in GMChannelType]: string
		};

		/**
		 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
		 * to find user folders.
		 * 
		 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
		 * as I don't know where the location is for Linux.
		 */
		default_user_paths: {
			[key in GMChannelType]: string
		};

		/** Default path to the global build directory. */
		default_global_build_path: string;

	}

	type IgorVerb = 
		'Run'			|
		'Package'		|
		'PackageZip'	|
		'Clean'			;
	
	interface JobEventMap {
		stdout: string;
		output: string;
		stop: Array<JobError>;
	};

	type JobStatus = 
		{ status: 'running' } |
		{ status: 'stopped', stoppedByUser: boolean, exitCode: number? };
	
	interface StdoutEntry {
		err: JobError;
		index: number;
		length: number;
	}

};
