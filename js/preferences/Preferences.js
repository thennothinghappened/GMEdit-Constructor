/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_global_build_path, def_runtime_paths, def_user_paths, IGOR_PLATFORM_INFO } from '../compiler/igor-paths.js';
import { BaseError, SolvableError } from '../utils/Err.js';
import { deep_assign } from '../utils/object.js';
import { GMRuntimeVersion } from '../compiler/GMVersion.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { Err, Ok } from '../utils/Result.js';
import { docString } from '../utils/StringUtils.js';
import { asNonEmptyArray } from '../utils/ArrayUtils.js';
import { flattenOptionArray, None, Some } from '../utils/Option.js';

/**
 * List of recognised GameMaker IDE/Runtime channel types.
 * @type {NonEmptyArray<GM.ReleaseChannel>} 
 */
export const GM_RELEASE_CHANNELS = ['Stable', 'Beta', 'LTS'];

/** @type {NonEmptyArray<GMS2.RuntimeType>} */
export const GMS2_RUNTIME_TYPES = ['VM', 'YYC'];

/** @type {Readonly<TPreferences.Data>} */
const PREFS_DEFAULT = {
	runtime_opts: {
		type_opts: {
			Stable: {
				search_path: def_runtime_paths.Stable,
				users_path: def_user_paths.Stable,
				prefabsPath: IGOR_PLATFORM_INFO.defaultPrefabsPaths.Stable,
			},
			Beta: {
				search_path: def_runtime_paths.Beta,
				users_path: def_user_paths.Beta,
				prefabsPath: IGOR_PLATFORM_INFO.defaultPrefabsPaths.Beta,
			},
			LTS: {
				search_path: def_runtime_paths.LTS,
				users_path: def_user_paths.LTS,
				prefabsPath: IGOR_PLATFORM_INFO.defaultPrefabsPaths.LTS,
			}
		}
	},
	projectLocalData: {},
	save_on_run_task: true,
	reuse_compiler_tab: true,
	check_for_updates: true,
	use_global_build: true,
	global_build_path: def_global_build_path,
	showTooltipHints: true,
	outputPosition: 'fullTab'
};

const MAX_LOAD_TRIES = 3;

/**
 * Global preferences for Constructor's behaviour. Much of this behaviour can be over-ridden on a
 * per-project basis.
 * 
 * @implements {GMS2.RuntimeProvider}
 */
export class Preferences {

	/**
	 * @private
	 * @type {EventEmitterImpl<TPreferences.PreferencesEventMap>}
	 */
	eventEmitter = new EventEmitterImpl([
		'runtimeListChanged',
		'userListChanged',
		'setCheckForUpdates',
		'setSaveOnRun',
		'setReuseOutputTab',
		'setUseGlobalBuildPath',
		'setGlobalBuildPath',
		'setShowTooltipHints',
		'setOutputPosition',
		'setPrefabsPath',
	]);

	/**
	 * Events for changing preferences!
	 * @returns {EventEmitter<TPreferences.PreferencesEventMap>}
	 */
	get events() {
		return this.eventEmitter;
	}

	/**
	 * Underlying preferences structure.
	 * 
	 * @private
	 * @type {TPreferences.Data} 
	*/
	prefs = structuredClone(PREFS_DEFAULT);

	/**
	 * Path preferences are saved to.
	 * 
	 * @type {string|undefined}
	 * @private
	 */
	dataPath = undefined;

	/**
	 * @private
	 */
	loadTries = 0;

	/**
	 * Logger for displaying problems to the user.
	 * 
	 * @readonly
	 * @private
	 * @type {ProblemLogger}
	 */
	problemLogger;

	/**
	 * @readonly
	 * @private
	 * @type {GMS2.RuntimeIndexer}
	 */
	gms2RuntimeIndexer;

	/**
	 * @readonly
	 * @private
	 * @type {GM.UserIndexer}
	 */
	userIndexer;

	/**
	 * List of runtimes for each type.
	 * Populated after loading the list.
	 * 
	 * @private
	 * @type {{ [key in GM.ReleaseChannel]?: NonEmptyArray<GMS2.RuntimeInfo> }}
	 */
	runtimesInChannels = {};

	/**
	 * List of users for each type.
	 * Populated after loading the list.
	 * 
	 * @private
	 * @type {{ [key in GM.ReleaseChannel]?: NonEmptyArray<GM.User> }}
	 */
	usersInChannels = {};

	/**
	 * @param {ProblemLogger} problemLogger
	 * @param {GMS2.RuntimeIndexer} gms2RuntimeIndexer
	 * @param {GM.UserIndexer} userIndexer
	 * @param {DiskIO} diskIO 
	 */
	constructor(problemLogger, gms2RuntimeIndexer, userIndexer, diskIO) {
		this.problemLogger = problemLogger;
		this.gms2RuntimeIndexer = gms2RuntimeIndexer;
		this.userIndexer = userIndexer;

		/** @private */
		this.diskIO = diskIO;
	}

	/**
	 * Whether the preferences cannot be modified.
	 */
	get readonly() {
		return (this.dataPath === undefined);
	}

	/**
	 * Save preferences back to the file.
	 * @private
	 */
	save() {
		if (this.dataPath !== undefined) {
			const result = this.diskIO.writeFileSync(this.dataPath, JSON.stringify(this.prefs));

			if (result.ok) {
				return;
			}

			this.problemLogger.error('Failed to write preferences to disk', result.err);
		}
	}

	/**
	 * Load the preferences, runtimes, and user information from the provided path.
	 * 
	 * @param {string} dataPath Path to where the preferences data is stored.
	 * @returns {Promise<Result<void>>}
	 */
	async load(dataPath) {

		this.loadTries ++;

		if (this.dataPath !== undefined) {
			// Reset the existing state.
			this.prefs = structuredClone(PREFS_DEFAULT);
			this.dataPath = undefined;
			this.loadTries = 0;
		}

		if (this.loadTries > MAX_LOAD_TRIES) {
			return Err(new BaseError(docString(`
				Exceeded the maximum number of load attempts. The preferences file (${dataPath})
				failed to load!
			`)));
		}
		
		const prefsFile = await this.diskIO.readFile(dataPath);

		if (!prefsFile.ok) {
			const ioResult = this.diskIO.writeFileSync(dataPath, JSON.stringify(this.prefs));

			if (!ioResult.ok) {
				return Err(new BaseError(
					'An unexpected error occurred in writing the default preferences file to disk.',
					ioResult.err
				));
			}

			return this.load(dataPath);
		}

		/** @type {Partial<TPreferences.Data>} */
		let loadedPrefs;

		try {
			loadedPrefs = JSON.parse(prefsFile.data.toString());
		} catch (err) {
			return Err(new SolvableError(
				'JSON parse error while reading the preferences file!', 
				docString(`
					Please check your preferences file (${dataPath}) for syntax errors as
					you must have edited it manually - see the stacktrace below.
				`),
				err
			));
		}

		this.dataPath = dataPath;
		deep_assign(this.prefs, loadedPrefs);

		const loadRequests = GM_RELEASE_CHANNELS.map(async channel => {

			const runtimesRequest = this.loadRuntimeList(channel);
			const usersRequest = this.loadUserList(channel);

			const [runtimesResult, usersResult] = await Promise.all([runtimesRequest, usersRequest]);

			if (runtimesResult.ok) {
				this.runtimesInChannels[channel] = runtimesResult.data;
			}
			
			if (usersResult.ok) {
				this.usersInChannels[channel] = usersResult.data;
			}

		});

		await Promise.all(loadRequests);
		return { ok: true };

	}

	/**
	 * Get a local properties store for the given project.
	 * 
	 * @param {GMEdit.Project} project 
	 * @returns {TPreferences.LocalProjectPropertiesStore}
	 */
	getLocalProjectPropertiesStore(project) {

		const preferences = this;

		return {

			/**
			 * @type {TPreferences.LocalProjectPropertiesStore['load']}
			 */
			load() {
				// We store the data for convenience, but its ownership is managed by the
				// `ProjectProperties` instance, so we clone it to avoid any possible pass-by-ref trouble.
				return structuredClone(preferences.prefs.projectLocalData[project.path] ?? {});
			},

			/**
			 * @type {TPreferences.LocalProjectPropertiesStore['save']}
			 */
			save(localProps) {
				preferences.prefs.projectLocalData[project.path] = localProps;
				preferences.save();
			}

		};

	}

	/**
	 * Whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	get reuseOutputTab() {
		return this.prefs.reuse_compiler_tab;
	}

	set reuseOutputTab(value) {

		this.prefs.reuse_compiler_tab = value;
		this.save();

		this.eventEmitter.emit('setReuseOutputTab', { reuseOutputTab: value });

	}

	/**
	 * Whether to save all files on running a task.
	 * @returns {Boolean}
	 */
	get saveOnRun() {
		return this.prefs.save_on_run_task;
	}

	set saveOnRun(value) {
		
		this.prefs.save_on_run_task = value;
		this.save();

		this.eventEmitter.emit('setSaveOnRun', { saveOnRun: value });

	}

	/**
	 * Whether we should automatically check for updates on startup.
	 * @returns {Boolean}
	 */
	get checkForUpdates() {
		return this.prefs.check_for_updates;
	}

	set checkForUpdates(value) {
		
		this.prefs.check_for_updates = value;
		this.save();

		this.eventEmitter.emit('setCheckForUpdates', { checkForUpdates: value });

	}

	/**
	 * Whether to use the global build directory.
	 */
	get useGlobalBuildPath() {
		return this.prefs.use_global_build;
	}

	set useGlobalBuildPath(value) {
		
		this.prefs.use_global_build = value;
		this.save();

		this.eventEmitter.emit('setUseGlobalBuildPath', { useGlobalBuildPath: value });

	}

	/**
	 * The global build directory path.
	 * @returns {String}
	 */
	get globalBuildPath() {
		return this.prefs.global_build_path;
	}

	set globalBuildPath(value) {
		
		this.prefs.global_build_path = value;
		this.save();

		this.eventEmitter.emit('setGlobalBuildPath', { globalBuildPath: value });

	}

	/**
	 * Whether to show visual hints on options that have tooltips.
	 */
	get showTooltipHints() {
		return this.prefs.showTooltipHints;
	}

	set showTooltipHints(value) {
		this.prefs.showTooltipHints = value;
		this.save();
		
		this.eventEmitter.emit('setShowTooltipHints', { showTooltipHints: value });
	}

	/**
	 * Whether compilation output should be a full tab, or use the bottom pane.
	 */
	get outputPosition() {
		return this.prefs.outputPosition;
	}

	set outputPosition(value) {
		this.prefs.outputPosition = value;
		this.save();
		
		this.eventEmitter.emit('setOutputPosition', value);
	}

	/**
	 * Get information regarding a particular runtime version.
	 * 
	 * If the given runtime version string is invalid, is not installed, or the given channel has no
	 * loaded list, an error is returned.
	 * 
	 * @param {GM.ReleaseChannel} channel The channel the runtime version was released in.
	 * @param {GMRuntimeVersion|string} versionOrVersionString The version.
	 * @returns {Result<GMS2.RuntimeInfo>}
	 */
	getRuntimeInfo(channel, versionOrVersionString) {

		const runtimes = this.getRuntimes(channel);

		if (runtimes === undefined) {
			return Err(new BaseError(`No runtime list is loaded for the channel "${channel}"`));
		}

		/** @type {GMRuntimeVersion} */
		let version;

		if (typeof versionOrVersionString === 'string') {

			const versionRes = GMRuntimeVersion.parse(versionOrVersionString);

			if (!versionRes.ok) {
				return Err(versionRes.err);
			}

			version = versionRes.data;

		} else {
			version = versionOrVersionString;
		}

		const runtimeInfo = runtimes.find(it => it.version.equals(version));

		if (runtimeInfo === undefined) {
			return Err(new BaseError(`The runtime "${version}" of channel "${channel}" not found in the installed list`));
		}

		return Ok(runtimeInfo);

	}

	/**
	 * Get information about a user in a given channel by their username.
	 * 
	 * @param {GM.ReleaseChannel} channel 
	 * @param {string} userName 
	 * @returns {GM.User|undefined}
	 */
	getUser(channel, userName) {
		return this.getUsers(channel)?.find(it => it.name === userName);
	}

	/**
	 * Get the global choice for default user for a given type. This may be `undefined` in the case
	 * that no users are found for the given channel.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {GM.User|undefined}
	 */
	getDefaultUser(channel) {

		const userDirectoryName = this.prefs.runtime_opts.type_opts[channel].user;
		const usersInChannel = this.usersInChannels[channel];

		if (usersInChannel === undefined) {
			return undefined;
		}

		return usersInChannel.find(it => it.directoryName === userDirectoryName)
			?? usersInChannel[0];

	}

	/**
	 * Set the global choice for default runtime for a given type.
	 * 
	 * @param {GM.ReleaseChannel} channel 
	 * @param {GM.User|undefined} user
	 */
	setDefaultUser(channel, user) {
		this.prefs.runtime_opts.type_opts[channel].user = user?.directoryName ?? undefined;
		this.save();
	}

	/**
	 * Get the list of known remote build devices for the given target platform.
	 * 
	 * @param {GM.SupportedPlatform} platform
	 * @returns {GMS2.RemoteDevice[]}
	 */
	getRemoteDevices(platform) {
		return GM_RELEASE_CHANNELS.flatMap(channel =>
			this.getUsers(channel)?.flatMap(user =>
				
				user.devices.forPlatform[platform]?.map(name => Some({
					channel,
					name,
					filePath: user.devices.path
				})) ?? None

			)?.flatMap(flattenOptionArray) ?? []
		);
	}

	/**
	 * Get the search path for runtime of a given type.
	 * 
	 *  @param {GM.ReleaseChannel} channel 
	 */
	getRuntimeSearchPath(channel) {
		return this.prefs.runtime_opts.type_opts[channel].search_path;
	}

	/**
	 * Get the users path for runtime of a given type.
	 * 
	 *  @param {GM.ReleaseChannel} channel 
	 */
	getUserSearchPath(channel) {
		return this.prefs.runtime_opts.type_opts[channel].users_path;
	}

	/**
	 * Get the prefab installation path.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {string}
	 */
	getPrefabsPath(channel) {
		return this.prefs.runtime_opts.type_opts[channel].prefabsPath;
	}

	/**
	 * Set the prefab installation path.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @param {string} prefabsPath
	 */
	setPrefabsPath(channel, prefabsPath) {
		this.prefs.runtime_opts.type_opts[channel].prefabsPath = prefabsPath;
		this.save();

		this.eventEmitter.emit('setPrefabsPath', { channel, prefabsPath });
	}

	/**
	 * Get the list of runtime version names for a given runtime type.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {NonEmptyArray<GMS2.RuntimeInfo>|undefined}
	 */
	getRuntimes(channel) {
		return this.runtimesInChannels[channel];
	};

	/**
	 * Get the list of users for a given runtime type.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {NonEmptyArray<GM.User>|undefined}
	 */
	getUsers(channel) {
		return this.usersInChannels[channel] ?? undefined;
	};

	/**
	 * Set the search path for runtime of a given type.
	 * 
	 * @param {GM.ReleaseChannel} channel 
	 * @param {string} search_path 
	 */
	async setRuntimeSearchPath(channel, search_path) {

		this.prefs.runtime_opts.type_opts[channel].search_path = search_path;
		this.save();

		this.runtimesInChannels[channel] = undefined;
		const res = await this.loadRuntimeList(channel);

		if (!res.ok) {

			this.problemLogger.error(`Failed to load ${channel} runtime list`, new SolvableError(
				`An error occurred while loading the runtime list for ${channel} channel runtimes.`,
				'Make sure the search path is valid!',
				res.err
			));

			this.eventEmitter.emit('runtimeListChanged', {
				channel,
				runtimesInfo: undefined
			});

			return;

		}

		const runtimesList = res.data;
		this.runtimesInChannels[channel] = runtimesList;

		this.eventEmitter.emit('runtimeListChanged', {
			channel,
			runtimesInfo: { runtimes: runtimesList }
		});

	}

	/**
	 * Set the users path for runtime of a given type.
	 * 
	 * @param {GM.ReleaseChannel} channel 
	 * @param {string} users_path 
	 */
	async setUserSearchPath(channel, users_path) {

		this.prefs.runtime_opts.type_opts[channel].users_path = users_path;
		this.save();

		this.usersInChannels[channel] = undefined;

		const userListRes = await this.loadUserList(channel);

		if (!userListRes.ok) {

			this.problemLogger.error(`Failed to load ${channel} user list`, new SolvableError(
				`An error occured while loading the list of users for ${channel} from "${users_path}".`,
				'Make sure the users path is valid!',
				userListRes.err,
			));

			this.eventEmitter.emit('userListChanged', {
				channel,
				usersInfo: undefined
			});

			return;

		}

		const users = userListRes.data;
		this.usersInChannels[channel] = users;

		this.eventEmitter.emit('userListChanged', {
			channel,
			usersInfo: {
				users,
				defaultUser: this.getDefaultUser(channel) ?? users[0]
			}
		});

	}

	/**
	 * Get the global runtime options for a given runtime type.
	 * 
	 * @private
	 * @param {GM.ReleaseChannel} channel 
	 */
	getRuntimeOptions(channel) {
		return this.prefs.runtime_opts.type_opts[channel];
	}

	/**
	 * Load the list of runtimes for the provided search path for a type.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {Promise<Result<NonEmptyArray<GMS2.RuntimeInfo>>>}
	 */
	async loadRuntimeList(channel) {

		const path = this.getRuntimeOptions(channel).search_path;
		const result = await this.gms2RuntimeIndexer.getRuntimes(path);

		if (!result.ok) {
			switch (result.err.code) {

				case 'pathReadError': return Err(new SolvableError(
					docString(`
						Failed to read the list of runtimes from the path "${path}".
					`),
					docString(`
						Check if this path is valid.
					`),
					result.err.inner
				));

				default: return Err(new BaseError(
					docString(`
						An unexpected error occurred while loading the runtime list from the path
						"${path}"!
					`),
					result.err.inner
				));

			}
		}

		result.data.invalidRuntimes.forEach(invalidRuntime => {

			/** @type {BaseError} */
			let error;
			
			switch (invalidRuntime.error.code) {

				case 'versionParseFailed':
					error = new BaseError(
						`Failed to parse runtime version name for runtime at '${invalidRuntime.path}'`,
						invalidRuntime.error.inner	
					);
				break;

				default: return;

			}

			this.problemLogger.debug('Invalid runtime found in search path', error);

		});

		const runtimes = asNonEmptyArray(result.data.runtimes);

		if (runtimes === undefined) {
			return Err(new BaseError(`No runtimes found at the path "${path}"`));
		}

		return Ok(runtimes);

	}

	/**
	 * Load the list of users for the provided users path for a type.
	 * 
	 * @param {GM.ReleaseChannel} channel
	 * @returns {Promise<Result<NonEmptyArray<GM.User>>>}
	 */
	async loadUserList(channel) {
		
		const path = this.getRuntimeOptions(channel).users_path;
		const result = await this.userIndexer.getUsers(path);

		if (!result.ok) {
			switch (result.err.code) {

				case 'pathReadError': return Err(new SolvableError(
					`Failed to read the list of users from the path "${path}".`,
					'Check if this path is valid.',
					result.err.inner
				));

				default: return Err(new BaseError(
					docString(`
						An unexpected error occurred while loading the user list from the path
						"${path}"!
					`),
					result.err.inner
				));

			}
		}

		const users = asNonEmptyArray(result.data.users);

		if (users === undefined) {
			return Err(new BaseError(`No users found at the path "${path}"`));
		}

		return Ok(users);

	}

}
