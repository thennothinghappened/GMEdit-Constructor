
export declare global {

	namespace TPreferences {

		type Data = {

			/** Globally selected runtime options that may be overriden by projects. */
			runtime_opts: {
				type: GMChannelType;
				runner: RuntimeBuildType;
	
				type_opts: {
					[key in GMChannelType]: RuntimePreference;
				};
			};
	
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
			
		}
	
		/**
		 * Project-specific preferences data!
		 */
		type ProjectData = {
	
			/** 
			 * Name of the active config to compile with.
			 */
			config_name: string;
	
			/**
			 * Chosen runtime type to use.
			 */
			runtime_type: GMChannelType;
	
			/**
			 * Chosen runtime version to use.
			 */
			runtime_version: string;
	
			/**
			 * Chosen runner type to use.
			 */
			runner: RuntimeBuildType;

			/**
			 * The platform to target when building for the current runtime.
			 */
			zeus_platform: Zeus.Platform;

			/** 
			 * Whether to reuse the compile viewer tab between runs. 
			 */
			reuse_compiler_tab: boolean;
	
		};

		type RuntimePreference = {
			/** Where we should search for the list of runtimes. */
			search_path: string;
	
			/** Where we should search for the list of users. */
			users_path: string;
	
			/** Chosen runtime to use. */
			choice?: string;
	
			/** Chosen user to use. */
			user?: string;
		};

		interface PreferencesEventMap {
			setDefaultRuntimeChannel: GMChannelType;
			runtimeListChanged: GMChannelType;
		}
		
		interface ProjectPropertiesEventMap {

			changeBuildConfig: { previous?: string, current: string };

			/**
			 * Fires when the runtime channel has changed. There are three variations corresponding
			 * to the cases where:
			 * 
			 * a) The channel was set to the default.
			 * 
			 * b) The channel was explicitly set to a different value, where it previously was default.
			 * 
			 * c) The channel was changed from one option to another.
			 */
			changeRuntimeChannel: 
				{ previous: GMChannelType, channel?: GMChannelType, isNetChange: boolean }	|
				{ previous?: GMChannelType, channel: GMChannelType, isNetChange: boolean }	|
				{ previous: GMChannelType, channel: GMChannelType, isNetChange: true }		;

			changeRuntimeVersion: string | undefined;

		}

	};

};
