/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_global_build_path, def_runtime_paths, def_user_paths, igor_path_segment } from '../compiler/igor-paths.js';
import { readFile, readdir } from '../utils/node/file.js';
import { BaseError, SolvableError } from '../utils/Err.js';
import { deep_assign } from '../utils/object.js';
import { PLUGIN_NAME } from '../GMConstructor.js';
import * as node from '../utils/node/node-import.js';
import { GMRuntimeVersion } from '../compiler/GMVersion.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { Err, Ok, okOrUndefined } from '../utils/Result.js';
import { docString } from '../utils/StringUtils.js';
import { asNonEmptyArray } from '../utils/ArrayUtils.js';

/**
 * List of recognised GameMaker IDE/Runtime channel types.
 * @type {NonEmptyArray<GMChannelType>} 
 */
export const GM_CHANNEL_TYPES = ['Stable', 'Beta', 'LTS'];

/** @type {NonEmptyArray<Zeus.RuntimeType>} */
export const ZEUS_RUNTIME_TYPES = ['VM', 'YYC'];

/** @type {Readonly<TPreferences.Data>} */
const PREFS_DEFAULT = {
	runtime_opts: {
		// Default runtime to use is probably going to be stable.
		type: 'Stable',
		runner: 'VM',

		type_opts: {
			Stable: {
				search_path: def_runtime_paths.Stable,
				users_path: def_user_paths.Stable
			},
			Beta: {
				search_path: def_runtime_paths.Beta,
				users_path: def_user_paths.Beta
			},
			LTS: {
				search_path: def_runtime_paths.LTS,
				users_path: def_user_paths.LTS
			}
		}
	},
	projectLocalData: {},
	save_on_run_task: true,
	reuse_compiler_tab: true,
	check_for_updates: true,
	use_global_build: true,
	global_build_path: def_global_build_path
};

/**
 * List of runtimes for each type.
 * Populated after loading the list.
 * 
 * @type {{ [key in GMChannelType]?: NonEmptyArray<Zeus.RuntimeInfo> }}
 */
const runtimesInChannels = {};

/**
 * List of users for each type.
 * Populated after loading the list.
 * 
 * @type {{ [key in GMChannelType]?: NonEmptyArray<UserInfo> }}
 */
const usersInChannels = {};

/**
 * Global preferences for Constructor's behaviour. Much of this behaviour can be over-ridden on a
 * per-project basis.
 */
export class Preferences {

	/**
	 * @private
	 * @type {EventEmitterImpl<TPreferences.PreferencesEventMap>}
	 */
	static eventEmitter = new EventEmitterImpl([
		'setDefaultRuntimeChannel',
		'runtimeListChanged',
		'userListChanged',
		'setCheckForUpdates',
		'setSaveOnRun',
		'setReuseOutputTab',
		'setUseGlobalBuildPath',
		'setGlobalBuildPath'
	]);

	/**
	 * Events for changing preferences!
	 * @returns {EventEmitter<TPreferences.PreferencesEventMap>}
	 */
	static get events() {
		return this.eventEmitter;
	}

	/**
	 * Whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	static get reuseOutputTab() {
		return this.prefs.reuse_compiler_tab;
	}

	static set reuseOutputTab(value) {

		this.prefs.reuse_compiler_tab = value;
		this.save();

		this.eventEmitter.emit('setReuseOutputTab', { reuseOutputTab: value });

	}

	/**
	 * Whether to save all files on running a task.
	 * @returns {Boolean}
	 */
	static get saveOnRun() {
		return this.prefs.save_on_run_task;
	}

	static set saveOnRun(value) {
		
		this.prefs.save_on_run_task = value;
		this.save();

		this.eventEmitter.emit('setSaveOnRun', { saveOnRun: value });

	}

	/**
	 * Whether we should automatically check for updates on startup.
	 * @returns {Boolean}
	 */
	static get checkForUpdates() {
		return this.prefs.check_for_updates;
	}

	static set checkForUpdates(value) {
		
		this.prefs.check_for_updates = value;
		this.save();

		this.eventEmitter.emit('setCheckForUpdates', { checkForUpdates: value });

	}

	/**
	 * Whether to use the global build directory.
	 */
	static get useGlobalBuildPath() {
		return this.prefs.use_global_build;
	}

	static set useGlobalBuildPath(value) {
		
		this.prefs.use_global_build = value;
		this.save();

		this.eventEmitter.emit('setUseGlobalBuildPath', { useGlobalBuildPath: value });

	}

	/**
	 * The global build directory path.
	 * @returns {String}
	 */
	static get globalBuildPath() {
		return this.prefs.global_build_path;
	}

	static set globalBuildPath(value) {
		
		this.prefs.global_build_path = value;
		this.save();

		this.eventEmitter.emit('setGlobalBuildPath', { globalBuildPath: value });

	}

	/**
	 * The desired runner type.
	 * @returns {Zeus.RuntimeType}
	 */
	static get runtimeBuildType() {
		return this.prefs.runtime_opts.runner;
	}

	static set runtimeBuildType(runner) {
		this.prefs.runtime_opts.runner = runner;
		this.save();
	}

	/**
	 * The default runtime type used globally.
	 */
	static get defaultRuntimeChannel() {
		return this.prefs.runtime_opts.type;
	}

	static set defaultRuntimeChannel(type) {
		
		this.prefs.runtime_opts.type = type;
		this.save();

		this.eventEmitter.emit('setDefaultRuntimeChannel', type);

	}

	/**
	 * Get the global preference choice for default runtime for a given type. This may be
	 * `undefined` in the case that no runtimes are installed for the given channel, or if the user
	 * has not chosen one.
	 * 
	 * @param {GMChannelType} channel
	 * @returns {Zeus.RuntimeInfo|undefined}
	 */
	static getPreferredRuntimeVersion(channel) {

		const version = this.prefs.runtime_opts.type_opts[channel].choice;

		if (version == undefined) {
			return undefined;
		}

		return okOrUndefined(this.getRuntimeInfo(channel, version));

	}

	/**
	 * Set the global choice for default runtime for a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {GMRuntimeVersion|undefined} version The runtime version to use, or `undefined` to clear the preference.
	 */
	static setPreferredRuntimeVersion(type, version) {
		this.prefs.runtime_opts.type_opts[type].choice = version?.toString();
		this.save();
	}

	/**
	 * Get information regarding a particular runtime version.
	 * 
	 * If the given runtime version string is invalid, is not installed, or the given channel has no
	 * loaded list, an error is returned.
	 * 
	 * @param {GMChannelType} channel The channel the runtime version was released in.
	 * @param {GMRuntimeVersion|string} versionOrVersionString The version.
	 * @returns {Result<Zeus.RuntimeInfo>}
	 */
	static getRuntimeInfo(channel, versionOrVersionString) {

		const runtimes = this.getInstalledRuntimeVersions(channel);

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
	 * Get the global choice for default user for a given type. This may be `undefined` in the case
	 * that no users are found for the given channel.
	 * 
	 * @param {GMChannelType} channel
	 * @returns {UserInfo|undefined}
	 */
	static getUser(channel) {

		const userName = this.prefs.runtime_opts.type_opts[channel].user;
		const usersInChannel = usersInChannels[channel];

		if (userName == undefined || usersInChannel === undefined) {
			return undefined;
		}

		return usersInChannel.find(it => it.name === userName);

	}

	/**
	 * Set the global choice for default runtime for a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {string|undefined} user 
	 */
	static setUser(type, user) {
		this.prefs.runtime_opts.type_opts[type].user = user ?? undefined;
		this.save();
	}

	/**
	 * Get the search path for runtime of a given type.
	 * 
	 *  @param {GMChannelType} type 
	 */
	static getRuntimeSearchPath(type) {
		return this.prefs.runtime_opts.type_opts[type].search_path;
	}

	/**
	 * Get the users path for runtime of a given type.
	 * 
	 *  @param {GMChannelType} type 
	 */
	static getUserSearchPath(type) {
		return this.prefs.runtime_opts.type_opts[type].users_path;
	}

	/**
	 * Get the list of runtime version names for a given runtime type.
	 * 
	 * @param {GMChannelType} channel
	 * @returns {NonEmptyArray<Zeus.RuntimeInfo>|undefined}
	 */
	static getInstalledRuntimeVersions(channel) {
		return runtimesInChannels[channel];
	};

	/**
	 * Get the list of users for a given runtime type.
	 * 
	 * @param {GMChannelType} type
	 * @returns {NonEmptyArray<UserInfo>|undefined}
	 */
	static getUsers(type) {
		return usersInChannels[type] ?? undefined;
	};

	/**
	 * Set the search path for runtime of a given type.
	 * 
	 * @param {GMChannelType} channel 
	 * @param {string} search_path 
	 */
	static async setRuntimeSearchPath(channel, search_path) {

		this.prefs.runtime_opts.type_opts[channel].search_path = search_path;
		this.save();

		runtimesInChannels[channel] = undefined;
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
		runtimesInChannels[channel] = runtimesList;

		this.eventEmitter.emit('runtimeListChanged', {
			channel,
			runtimesInfo: {
				runtimes: runtimesList,
				preferredRuntime: this.getPreferredRuntimeVersion(channel)
			}
		});

	}

	/**
	 * Set the users path for runtime of a given type.
	 * 
	 * @param {GMChannelType} channel 
	 * @param {string} users_path 
	 */
	static async setUserSearchPath(channel, users_path) {

		this.prefs.runtime_opts.type_opts[channel].users_path = users_path;
		this.save();

		usersInChannels[channel] = undefined;

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
		const defaultUser = users[0];

		usersInChannels[channel] = users;
		this.setUser(channel, defaultUser.name);

		this.eventEmitter.emit('userListChanged', {
			channel,
			usersInfo: { users, defaultUser }
		});

	}

	/**
	 * Get the global runtime options for a given runtime type.
	 * 
	 * @private
	 * @param {GMChannelType} type 
	 */
	static getRuntimeOptions(type) {
		return this.prefs.runtime_opts.type_opts[type];
	}

	/**
	 * Load the list of runtimes for the provided search path for a type.
	 * 
	 * @param {GMChannelType} type
	 * @returns {Promise<Result<NonEmptyArray<Zeus.RuntimeInfo>>>}
	 */
	static loadRuntimeList(type) {
		return this.loadRuntimeListFrom(this.getRuntimeOptions(type).search_path);
	}

	/**
	 * Load the list of users for the provided users path for a type.
	 * 
	 * @param {GMChannelType} type
	 * @returns {Promise<Result<NonEmptyArray<UserInfo>>>}
	 */
	static loadUserList(type) {
		return this.loadUserListFrom(this.getRuntimeOptions(type).users_path);
	}

	/**
	 * Load the list of runtimes for the provided search path.
	 * 
	 * @param {String} search_path 
	 * @returns {Promise<Result<NonEmptyArray<Zeus.RuntimeInfo>>>}
	 */
	static async loadRuntimeListFrom(search_path) {

		const runtimeVersionListRes = await readdir(search_path);

		if (!runtimeVersionListRes.ok) {
			return Err(new BaseError(
				`Failed to read search path '${search_path}': ${runtimeVersionListRes.err}`
			));
		}

		const runtimeVersionList = runtimeVersionListRes.data;
		const runtimes = runtimeVersionList
			.map(dirname => ({ dirname, path: node.path.join(search_path, dirname) }))
			.filter(({ path }) => Electron_FS.lstatSync(path).isDirectory())
			.map(({ dirname, path }) => {

				const igorPath = node.path.join(path, igor_path_segment);
				const version_res = GMRuntimeVersion.parse(dirname);

				if (!version_res.ok) {

					this.problemLogger.debug('Invalid runtime found in search path', new BaseError(
						`Failed to parse runtime version name for runtime at '${path}'`, 
						version_res.err
					));

					return undefined;

				}

				const runtime = version_res.data;
				const supported_res = runtime.supported();

				if (!supported_res.ok) {

					this.problemLogger.debug('Excluding unsupported runtime', new BaseError(
						`Excluding unsupported runtime ${runtime}`,
						supported_res.err
					));
					
					return undefined;

				}

				return { path, igorPath, version: runtime };

			})
			.filter(runtime => runtime !== undefined)
			.filter(runtime => Electron_FS.existsSync(runtime.igorPath))
			.sort((a, b) => b.version.compare(a.version));
		
		const nonEmptyRuntimesArray = asNonEmptyArray(runtimes);

		if (nonEmptyRuntimesArray === undefined) {
			return Err(new BaseError(`Runtimes list at path "${search_path}" is empty`));
		}

		return Ok(nonEmptyRuntimesArray);

	}

	/**
	 * Load the list of users for the provided search path.
	 *  
	 * @param {String} users_path 
	 * @returns {Promise<Result<NonEmptyArray<UserInfo>>>}
	 */
	static async loadUserListFrom(users_path) {

		const userNameListRes = await readdir(users_path);
		
		if (!userNameListRes.ok) {
			return Err(new BaseError(
				`Failed to read users path '${users_path}': ${userNameListRes.err}`
			));
		}

		const userNameList = userNameListRes.data;

		const users = userNameList.map(dirname => ({
				path: node.path.join(users_path, dirname),
				name: dirname
			}))
			.filter(user => (
				Electron_FS.existsSync(node.path.join(user.path, 'license.plist')) ||
				Electron_FS.existsSync(node.path.join(user.path, 'local_settings.json')
			)))
			.sort((a, b) => +(a.name > b.name));
		
		const nonEmptyUsersList = asNonEmptyArray(users);

		if (nonEmptyUsersList === undefined) {
			return Err(new BaseError(`No users found at path "${users_path}"`));
		}

		return Ok(nonEmptyUsersList);

	}

	/**
	 * Save preferences back to the file.
	 * @private
	 */
	static save() {
		return Electron_FS.writeFileSync(this.savePath, JSON.stringify(this.prefs));
	}

	/**
	 * Underlying preferences structure.
	 * 
	 * @private
	 * @type {TPreferences.Data} 
	*/
	// prefs_default has to be cloned (instead of using Object.create),
	// otherwise properties inside other objects won't be saved into the config file,
	// as JSON.stringify doesn't stringify properties in object prototypes
	static prefs = structuredClone(PREFS_DEFAULT);;

	/**
	 * Path preferences are saved to.
	 * 
	 * @type {string}
	 * @private
	 */
	static savePath;

	/**
	 * Logger for displaying problems to the user.
	 * 
	 * @private
	 * @type {ProblemLogger}
	 */
	static problemLogger;

	/**
	 * Load the local properties of the given project.
	 * 
	 * @param {GMEdit.Project} project
	 * @returns {Partial<TPreferences.Project.LocalData>}
	 */
	static loadProjectLocalProps(project) {
		// We store the data for convenience, but its ownership is managed by the
		// `ProjectProperties` instance, so we clone it to avoid any possible pass-by-ref trouble.
		return structuredClone(this.prefs.projectLocalData[project.path] ?? {});
	}

	/**
	 * Save the local properties of the given project to disk.
	 * 
	 * @param {GMEdit.Project} project
	 * @param {Partial<TPreferences.Project.LocalData>} local
	 */
	static saveProjectLocalProps(project, local) {
		this.prefs.projectLocalData[project.path] = local;
		this.save();
	}

	/**
	 * Init a new instance of Preferences asynchronously (requires loading file.)
	 * 
	 * @param {ProblemLogger} problemLogger
	 * @returns {Promise<Result<typeof Preferences>>}
	 */
	static async create(problemLogger) {

		this.problemLogger = problemLogger;
		this.savePath = node.path.join(Electron_App.getPath('userData'), 'GMEdit', 'config', `${PLUGIN_NAME}.json`);

		/** @type {Partial<TPreferences.Data>|undefined} */
		let loadedPrefs = undefined;

		const prefsLoadRes = await readFile(this.savePath);

		if (prefsLoadRes.ok) {
			
			try {
				loadedPrefs = JSON.parse(prefsLoadRes.data.toString());
			} catch (err) {
				this.problemLogger.error('Failed to load preferences', new SolvableError(
					'JSON parse error while reading the preferences file!', 
					docString(`
						Please check your preferences file (${this.savePath}) for syntax errors as
						you must have edited it manually - see the stacktrace below.
					`),
					err
				));
			}

		}

		if (loadedPrefs !== undefined) {

			if (loadedPrefs.runtime_opts?.type != undefined) {
				if (!GM_CHANNEL_TYPES.includes(loadedPrefs.runtime_opts.type)) {
					// Fix invalid channel choice.
					loadedPrefs.runtime_opts.type = this.prefs.runtime_opts.type;
				}
			}

			deep_assign(this.prefs, loadedPrefs);

		}

		const loadRequests = GM_CHANNEL_TYPES.map(async channel => {

			const runtimesRequest = this.loadRuntimeList(channel);
			const usersRequest = this.loadUserList(channel);

			const [runtimesResult, usersResult] = await Promise.all([runtimesRequest, usersRequest]);

			if (runtimesResult.ok) {
				// TODO: pass onto constructor instead when Preferences is not a singleton.
				runtimesInChannels[channel] = runtimesResult.data;
			}
			
			if (usersResult.ok) {
				// TODO: pass onto constructor instead when Preferences is not a singleton.
				usersInChannels[channel] = usersResult.data;
			}

			return {
				channel,
				runtimes: runtimesResult.ok ? runtimesResult.data : undefined,
				users: usersResult.ok ? usersResult.data : undefined
			};

		});

		// TODO: pass onto constructor when Preferences is not a singleton.
		const channelDataList = await Promise.all(loadRequests);

		return Ok(this);

	}

}
