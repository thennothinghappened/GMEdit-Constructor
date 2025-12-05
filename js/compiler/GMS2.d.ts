import { GMRuntimeVersion } from './GMVersion';

export declare global {

	/**
	 * Things relating to the current GameMaker runtime (Zeus).
	 */
	namespace GMS2 {

		type FindCompatibleRuntimeData = {
			runtime: RuntimeInfo;
			channel: GM.ReleaseChannel;
		};

		type FindCompatibleRuntimeError =
			{ type: 'none-compatible', channel?: GM.ReleaseChannel }	|
			{ type: 'channel-empty', channel: GM.ReleaseChannel }		;

		interface RuntimeProvider {

			/**
			 * Get the list of available runtimes in the given channel.
			 * @param channel The runtime channel to query for.
			 */
			getRuntimes(channel: GM.ReleaseChannel): NonEmptyArray<RuntimeInfo> | undefined;

		};

		/**
		 * A method of indexing GMS2 runtimes for use in compilation.
		 */
		interface RuntimeIndexer {
			/**
			 * Get the list of runtimes at the given location.
			 * @param path Path to the directory where the runtime list can be found.
			 */
			async getRuntimes(path: string): Promise<Result<RuntimeIndexer.GetData, RuntimeIndexer.GetError>>;
		};

		namespace RuntimeIndexer {

			type GetError =
				{ code: 'pathReadError', inner: Error };
			
			type GetData = {
				runtimes: RuntimeInfo[];
				invalidRuntimes: InvalidRuntimeInfo[];
			};

			type InvalidRuntimeInfo = {
				path: string;
				error: InvalidRuntimeInfoError;
			};

			type InvalidRuntimeInfoError = 
				{ code: 'versionParseFailed', inner: Error };

		};

		/**
		 * Information for a specific found runtime.
		 */
		type RuntimeInfo = {
			version: GMRuntimeVersion;
			path: string;
			igorPath: string;
		};

		type RuntimeType =
			'VM'	|
			'YYC'	;

		type RemoteDevice = {
			name: string;
			channel: GM.ReleaseChannel;
			filePath: string;
		};

		/**
		 * Settings for running an Igor Job.
		 */
		type IgorSettings = {

			/**
			 * Which platform the action will run for.
			 */
			platform: GM.SupportedPlatform;

			/**
			 * The user whose license we'll provide.
			 */
			user: GM.User;

			/**
			 * The runtime to use to compile the project.
			 */
			runtime: GMS2.RuntimeInfo;

			/**
			 * An additional location to search for prefabs, besides the `/prefabs` folder in the
			 * project itself.
			 */
			prefabsPath?: string;

			/**
			 * A remote device to build on.
			 */
			device?: RemoteDevice;

			/**
			 * The Igor action to run.
			 */
			task: GM.Task;

			/**
			 * Which runner to use - default is VM.
			 */
			runtimeType: RuntimeType;

			/**
			 * How many threads to use for this compilation.
			 */
			threads?: number;

			/**
			 * Name of the Build Config to use for this compilation.
			 */
			configName: string;

			/**
			 * The path to the directory to output build files to.
			 */
			buildPath: string;

			/**
			 * Launch the executable on the target device after building;
			 * same as the "Create Executable and Launch" option in the IDE
			 */
			launch?: boolean;

		};

		/**
		 * Host (OS) platform information for Igor.
		 */
		type IgorPlatformInfo = {

			/** Extension of the `Igor` executable for the target platform's runtime. */
			platform_executable_extension: string;

			/** Platform-specific path segment of the `Igor` executable. */
			platform_path_name: string;

			/** {@link GM.HostPlatform} to native build for the host OS. */
			user_platform: GM.HostPlatform;

			/**
			 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
			 * to find runtimes.
			 * 
			 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
			 * as I don't know where the location is for Linux.
			 */
			default_runtime_paths: {
				[key in GM.ReleaseChannel]: string
			};

			/**
			 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
			 * to find user folders.
			 * 
			 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
			 * as I don't know where the location is for Linux.
			 */
			default_user_paths: {
				[key in GM.ReleaseChannel]: string
			};

			/**
			 * Default directories for the prefab libraries to pass to the compiler.
			 */
			defaultPrefabsPaths: Record<GM.ReleaseChannel, string>;

			/** Default path to the global build directory. */
			default_global_build_path: string;

		}

	};

};
