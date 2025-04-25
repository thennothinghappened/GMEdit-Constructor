import { GMRuntimeVersion } from "../compiler/GMVersion";
import { BaseError, InvalidStateErr } from "../utils/Err";
import { Preferences } from "./Preferences";

export declare global {

	namespace TPreferences {

		/**
		 * A method of saving and loading local project properties for a specific project.
		 */
		interface LocalProjectPropertiesStore {

			/**
			 * Load the local properties of the given project.
			 */
			load(): Partial<TPreferences.Project.LocalData>;

			/**
			 * Save the local properties of the given project to disk.
			 * 
			 * @param localProps
			 */
			save(localProps: Partial<TPreferences.Project.LocalData>);

		};

		type Data = {

			/** Globally selected runtime options that may be overriden by projects. */
			runtime_opts: {
				runner: GMS2.RuntimeType;
	
				type_opts: {
					[key in GM.ReleaseChannel]: RuntimePerChannelPrefs;
				};
			};

			/** 
			 * Local per-project data stored on this computer, for things that shouldn't be shared
			 * between users on a project repo.
			 */
			projectLocalData: Record<string, Partial<Project.LocalData>>;
	
			/** Whether to automatically save open files when a task runs. */
			save_on_run_task: boolean;
	
			/** Whether to reuse the compile viewer tab between runs. */
			reuse_compiler_tab: boolean;
	
			/** Whether we should check for updates on startup. */
			check_for_updates: boolean;
	
			/** Whether to use the global build directory. */
			use_global_build: boolean;
	
			/** Global build directory path. */
			global_build_path: string;

			/**
			 * Whether to show visual hints on options that have tooltips.
			 */
			showTooltipHints: boolean;
			
		}

		/**
		 * Project-specific data.
		 */
		namespace Project {

			/**
			 * Project-specific preferences data that is stored alongside the project!
			 */
			type PortableData = {
		
				/**
				 * Release channel to use, if specified.
				 */
				runtimeReleaseChannel?: GM.ReleaseChannel;
		
				/**
				 * Chosen runtime version to use in that channel, if specified.
				 */
				runtimeVersion?: string;
		
			};

			/**
			 * Project property data that is local to this machine.
			 */
			type LocalData = {

				/**
				 * Name of the active config to compile with.
				 */
				buildConfig: string;

				/**
				 * Chosen runner type to use.
				 */
				runtimeType: GMS2.RuntimeType;

				/**
				 * The platform to target when building for the current runtime.
				 */
				platform: GMS2.Platform;

				/** 
				 * Whether to reuse the compile viewer tab between runs. 
				 */
				reuseOutputTab: boolean;

			};

		}

		type RuntimePerChannelPrefs = {
			/** Where we should search for the list of runtimes. */
			search_path: string;
	
			/** Where we should search for the list of users. */
			users_path: string;
	
			/** Chosen user to use. */
			user?: string;
		};

		interface PreferencesEventMap {

			setCheckForUpdates: { checkForUpdates: boolean };
			setSaveOnRun: { saveOnRun: boolean };
			setReuseOutputTab: { reuseOutputTab: boolean };
			setUseGlobalBuildPath: { useGlobalBuildPath: boolean };
			setGlobalBuildPath: { globalBuildPath: string };
			setShowTooltipHints: { showTooltipHints: boolean };

			/**
			 * Fires when the list of runtimes is modified for a given release channel.
			 */
			runtimeListChanged: {

				/**
				 * The channel in question.
				 */
				channel: GM.ReleaseChannel;

				/**
				 * Information about the new configuration, or `undefined` if the channel is no
				 * longer active, i.e. its path points to somewhere empty or invalid.
				 */
				runtimesInfo?: {

					/**
					 * The new list of runtimes.
					 */
					runtimes: NonEmptyArray<GMS2.RuntimeInfo>;
					
				};

			};

			/**
			 * Fires when the list of users is modified for a given release channel.
			 */
			userListChanged: {

				/**
				 * The channel in question.
				 */
				channel: GM.ReleaseChannel;

				/**
				 * Information about the new configuration, or `undefined` if the channel is no
				 * longer active, i.e. its path points to somewhere empty or invalid.
				 */
				usersInfo?: {

					/**
					 * The new list of users.
					 */
					users: NonEmptyArray<GM.User>;

					/**
					 * The default selected user.
					 */
					defaultUser: GM.User;

				};

			};

		}
		
		interface ProjectPropertiesEventMap {

			setBuildConfig: {
				previous?: string;
				current: string;
			};

			setRuntimeChannel: {
				channel?: GM.ReleaseChannel;
			};

			setRuntimeVersion: {
				version?: GMRuntimeVersion;
			};

			setReuseOutputTab: {
				reuseOutputTab?: boolean;
			};

		}

		type ProjectPropertiesGetError =
			{ isPluginError: false, error: BaseError }		|
			{ isPluginError: true, error: InvalidStateErr }	;

	};

};
