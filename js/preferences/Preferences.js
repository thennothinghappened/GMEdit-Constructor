/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_global_build_path, def_runtime_paths, def_user_paths, igor_path_segment } from '../compiler/igor-paths.js';
import { readFileSync, readdir } from '../utils/node/file.js';
import { Err } from '../utils/Err.js';
import { deep_assign } from '../utils/object.js';
import { plugin_name } from '../GMConstructor.js';
import * as node from '../utils/node/node-import.js';
import { runtime_version_parse } from '../compiler/RuntimeVersion.js';
import { ControlPanelTab } from '../ui/tabs/control-panel/ControlPanelTab.js';
import { use } from '../utils/scope-extensions/use.js';

/**
 * List of recognised GameMaker IDE/Runtime channel types.
 * @type {Readonly<GMChannelType[]>} 
 */
export const GM_CHANNEL_TYPES = ['Stable', 'Beta', 'LTS'];

/** @type {Readonly<RunnerType[]>} */
export const VALID_RUNNER_TYPES = ['VM', 'YYC'];

/** @type {Readonly<TPreferences.Data>} */
const PREFS_DEFAULT = {
	runtime_opts: {
		// Default runtime to use is probably going to be stable.
		type: 'Stable',
		runner: 'VM',

		type_opts: {
			Stable: {
				search_path: def_runtime_paths.Stable,
				users_path: def_user_paths.Stable,
				choice: null,
				user: null
			},
			Beta: {
				search_path: def_runtime_paths.Beta,
				users_path: def_user_paths.Beta,
				choice: null,
				user: null
			},
			LTS: {
				search_path: def_runtime_paths.LTS,
				users_path: def_user_paths.LTS,
				choice: null,
				user: null
			}
		}
	},

	save_on_run_task: true,
	reuse_compiler_tab: true,
	check_for_updates: true,
	use_global_build: false,
	global_build_path: def_global_build_path
};

/**
 * List of runtimes for each type.
 * Populated after loading the list.
 * 
 * @type {{ [key in GMChannelType]: RuntimeInfo[]? }}
 */
const runtimes = {
	Stable: null,
	Beta: null,
	LTS: null
};

/**
 * List of users for each type.
 * Populated after loading the list.
 * 
 * @type {{ [key in GMChannelType]: UserInfo[]? }}
 */
const users = {
	Stable: null,
	Beta: null,
	LTS: null
};

export class Preferences {

	/**
	 * Whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	static get reuse_compiler_tab() {
		return this.prefs.reuse_compiler_tab;
	}

	static set reuse_compiler_tab(reuse_compiler_tab) {
		this.prefs.reuse_compiler_tab = reuse_compiler_tab;
		this.save();
	}

	/**
	 * Whether to save all files on running a task.
	 * @returns {Boolean}
	 */
	static get save_on_run_task() {
		return this.prefs.save_on_run_task;
	}

	static set save_on_run_task(save_on_run_task) {
		this.prefs.save_on_run_task = save_on_run_task;
		this.save();
	}

	/**
	 * Whether we should automatically check for updates on startup.
	 * @returns {Boolean}
	 */
	static get check_for_updates() {
		return this.prefs.check_for_updates;
	}

	static set check_for_updates(check_for_updates) {
		this.prefs.check_for_updates = check_for_updates;
		this.save();
	}

	/**
	 * Whether to use the global build directory.
	 */
	static get use_global_build() {
		return this.prefs.use_global_build;
	}

	static set use_global_build(use_global_build) {
		this.prefs.use_global_build = use_global_build;
		this.save();
	}

	/**
	 * The global build directory path.
	 * @returns {String}
	 */
	static get global_build_path() {
		return this.prefs.global_build_path;
	}

	static set global_build_path(global_build_path) {
		this.prefs.global_build_path = global_build_path;
		this.save();
	}

	/**
	 * The desired runner type.
	 * @returns {RunnerType}
	 */
	static get runner() {
		return this.prefs.runtime_opts.runner;
	}

	static set runner(runner) {
		this.prefs.runtime_opts.runner = runner;
		this.save();
	}

	/**
	 * The default runtime type used globally.
	 */
	static get runtime_channel_type() {
		return this.prefs.runtime_opts.type;
	}

	static set runtime_channel_type(type) {
		this.prefs.runtime_opts.type = type;
		this.save();
	}

	/**
	 * Get the global choice for default runtime for a given type.
	 * @param {GMChannelType} [type] 
	 */
	static runtime_version_get(type = this.runtime_channel_type) {
		return this.prefs.runtime_opts.type_opts[type].choice;
	}

	/**
	 * Set the global choice for default runtime for a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {string?} choice 
	 */
	static runtime_version_set(type, choice) {
		this.prefs.runtime_opts.type_opts[type].choice = choice;
		this.save();
	}

	/**
	 * Get the global choice for default user for a given type.
	 * 
	 * @param {GMChannelType} [type] 
	 */
	static user_get(type = this.runtime_channel_type) {
		return this.prefs.runtime_opts.type_opts[type].user;
	}

	/**
	 * Set the global choice for default runtime for a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {string?} user 
	 */
	static user_set(type, user) {
		this.prefs.runtime_opts.type_opts[type].user = user;
		this.save();
	}

	/**
	 * Get the search path for runtime of a given type.
	 * 
	 *  @param {GMChannelType} type 
	 */
	static runtime_search_path_get(type) {
		return this.prefs.runtime_opts.type_opts[type].search_path;
	}

	/**
	 * Get the users path for runtime of a given type.
	 * 
	 *  @param {GMChannelType} type 
	 */
	static users_search_path_get(type) {
		return this.prefs.runtime_opts.type_opts[type].users_path;
	}

	/**
	 * Function to get a list of runtime version names for a given runtime type.
	 * 
	 * @param {GMChannelType} type
	 * @returns {RuntimeInfo[]?}
	 */
	static runtime_versions_get_for_type(type) {
		return runtimes[type];
	};

	/**
	 * Function to get a list of user names for a given runtime type.
	 * 
	 * @param {GMChannelType} type
	 * @returns {UserInfo[]?}
	 */
	static users_get_for_type(type) {
		return users[type];
	};

	/**
	 * Set the search path for runtime of a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {string} search_path 
	 */
	static async runtime_search_path_set(type, search_path) {

		this.prefs.runtime_opts.type_opts[type].search_path = search_path;
		this.save();

		runtimes[type] = null;

		const res = await this.runtime_list_load_type(type);

		if (!res.ok) {

			const err = new Err(
				`An error occurred while loading the runtime list for ${type} channel runtimes.`,
				res.err,
				'Make sure the search path is valid!'
			);

			return ControlPanelTab
				.view(true)
				.showError(`Failed to load ${type} runtime list`, err);
		}

		runtimes[type] = res.data;

		use(this.runtime_version_get(type))
			.let(it => (it !== null) ? it : undefined)
			?.takeIf(it => runtimes[type]?.find(info => info.version.toString() === it) === undefined)
			?.also(it => {

				const err = new Err(
					`Runtime version "${it}" not available in new search path "${search_path}".`,
					undefined,
					`Is the path correct? Have you deleted the runtime "${it}"?`
				);
		
				ControlPanelTab.showDebug('Chosen Runtime version not available', err);
				this.runtime_version_set(type, runtimes[type]?.at(0)?.version?.toString() ?? null);

			});

	}

	/**
	 * Set the users path for runtime of a given type.
	 * 
	 * @param {GMChannelType} type 
	 * @param {string} users_path 
	 */
	static async users_search_path_set(type, users_path) {

		this.prefs.runtime_opts.type_opts[type].users_path = users_path;
		this.save();

		users[type] = null;

		const res = await this.user_list_load_type(type);

		if (!res.ok) {

			const err = new Err(
				`An error occured while loading the list of users for ${type} from "${users_path}".`,
				res.err,
				'Make sure the users path is valid!'
			);

			return ControlPanelTab
				.view(true)
				.showError(`Failed to load ${type} user list`, err);
		}

		users[type] = res.data;

		const choice = this.user_get(type);

		if (
			choice !== undefined && 
			users[type]?.find(user => user.name === choice) === undefined
		) {

			const err = new Err(`User "${choice}" not available in new users path "${users_path}".`);

			ControlPanelTab
				.view(false)
				.showWarning('Selected user is no longer valid', err);
			
			this.user_set(type, users[type]?.at(0)?.name?.toString() ?? null);

		}

	}

	/**
	 * Get the global runtime options for a given runtime type.
	 * 
	 * @param {GMChannelType} type 
	 */
	static global_runtime_opts_get(type = this.runtime_channel_type) {
		return this.prefs.runtime_opts.type_opts[type];
	}

	/**
	 * Load the list of runtimes for the provided search path for a type.
	 * 
	 * @param {GMChannelType} [type] 
	 * @returns {Promise<Result<RuntimeInfo[]>>}
	 */
	static async runtime_list_load_type(type = this.runtime_channel_type) {

		const { search_path } = this.global_runtime_opts_get(type);
		return this.runtime_list_load_path(type, search_path);
	}

	/**
	 * Load the list of users for the provided users path for a type.
	 * 
	 * @param {GMChannelType} [type] 
	 * @returns {Promise<Result<UserInfo[]>>}
	 */
	static async user_list_load_type(type = this.runtime_channel_type) {

		const { users_path } = this.global_runtime_opts_get(type);
		return this.user_list_load_path(type, users_path);
	}

	/**
	 * Load the list of runtimes for the provided search path.
	 * 
	 * @param {GMChannelType} type 
	 * @param {String} search_path 
	 * @returns {Promise<Result<RuntimeInfo[]>>}
	 */
	static async runtime_list_load_path(type, search_path) {

		const dir_res = await readdir(search_path);

		if (!dir_res.ok) {
			return {
				ok: false,
				err: new Err(`Failed to read search path '${search_path}': ${dir_res.err}`),
			};
		}

		/** @type {RuntimeInfo[]} */
		const runtimes = dir_res.data
			.map(dirname => ({ dirname, path: node.path.join(search_path, dirname) }))
			.filter(({ path }) => Electron_FS.lstatSync(path).isDirectory())
			.map(({ dirname, path }) => {

				const igor_path = node.path.join(path, igor_path_segment);
				const version_res = runtime_version_parse(type, dirname);

				if (!version_res.ok) {

					ControlPanelTab.showDebug('Invalid runtime found in search path', new Err(
						`Failed to parse runtime version name for runtime at '${path}'`, 
						version_res.err
					));

					return null;
				}

				const runtime = version_res.data;
				const supported_res = runtime.supported();

				if (!supported_res.ok) {

					ControlPanelTab.showDebug('Excluding unsupported runtime', new Err(
						`Excluding unsupported runtime ${runtime}`, supported_res.err
					));
					
					return null;
				}

				return {
					path,
					igor_path,
					version: runtime
				};

			})
			.filter(/** @returns {runtime is RuntimeInfo} */ (runtime) => runtime !== null)
			.sort((a, b) => b.version.compare(a.version));

		return {
			ok: true,
			data: runtimes.filter(runtime => Electron_FS.existsSync(runtime.igor_path))
		};
	}

	/**
	 * Load the list of users for the provided search path.
	 * 
	 * @param {GMChannelType} type 
	 * @param {String} users_path 
	 * @returns {Promise<Result<UserInfo[]>>}
	 */
	static async user_list_load_path(type, users_path) {

		const dir_res = await readdir(users_path);
		
		if (!dir_res.ok) {
			return {
				ok: false,
				err: new Err(`Failed to read users path '${users_path}': ${dir_res.err}`),
			};
		}

		/** @type {UserInfo[]} */
		const users = dir_res.data
			.map(dirname => {
				return {
					path: node.path.join(users_path, dirname),
					name: dirname
				};
		})
		.sort((a, b) => +(a.name > b.name));

		return {
			ok: true,
			data: users.filter(user => 
				Electron_FS.existsSync(node.path.join(user.path, 'license.plist')) ||
				Electron_FS.existsSync(node.path.join(user.path, 'local_settings.json'))
			)
		};
	}

	/**
	 * Save preferences back to the file.
	 * @private
	 */
	static save() {
		return Electron_FS.writeFileSync(this.save_path, JSON.stringify(this.prefs));
	}

	/**
	 * @type {TPreferences.Data} 
	 * @private
	 */
	static prefs = Object.create(PREFS_DEFAULT);

	/**
	 * Path preferences are saved to.
	 * 
	 * @type {string}
	 * @private
	 */
	static save_path;

	/**
	 * @private
	 */
	static __ready__ = false;

	/**
	 * Returns whether the preferences are loaded.
	 */
	static get ready() {
		return this.__ready__;
	}

	/**
	 * Init a new instance of Preferences asynchronously (requires loading file.)
	 * 
	 * @returns {Promise<Result<void>>}
	 */
	static async __setup__() {

		this.save_path = node.path.join(Electron_App.getPath('userData'), 'GMEdit', 'config', `${plugin_name}.json`);

		/** @type {Partial<TPreferences.Data>|undefined} */
		let loaded_prefs = undefined;

		const prefsLoadRes = readFileSync(this.save_path);

		if (prefsLoadRes.ok) {
			
			try {
				loaded_prefs = JSON.parse(prefsLoadRes.data.toString());
			} catch (err_cause) {

				const err = new Err(
					'JSON parse error while reading the preferences file!', 
					err_cause,
					`Please check your preferences file (${this.save_path}) for syntax errors as you must have edited it manually - see stacktrace below.`
				);

				ControlPanelTab
					.view(true)
					.showError('Failed to load preferences', err);

			}

		}

		if (loaded_prefs?.runtime_opts?.type !== undefined) {
			if (!GM_CHANNEL_TYPES.includes(loaded_prefs.runtime_opts.type)) {

				ControlPanelTab.showWarning(
					`Invalid preferred runtime type`,
					new Err(`'${loaded_prefs.runtime_opts.type}' is invalid, changed to ${this.prefs.runtime_opts.type}`)
				);
				
				loaded_prefs.runtime_opts.type = this.prefs.runtime_opts.type;

			}
		}

		if (loaded_prefs?.runtime_opts?.type_opts !== undefined) {

			const type_opts = loaded_prefs?.runtime_opts?.type_opts;

			for (const type of GM_CHANNEL_TYPES) {
				if (!(type in type_opts)) {

					ControlPanelTab.showWarning('Missing runtime type preference data', new Err(
						`Missing runtime type preference data for type '${type}', replacing with default.`
					));

					loaded_prefs.runtime_opts.type_opts[type] = this.prefs.runtime_opts.type_opts[type];

				}
			}

		}
		
		// prefs_default has to be cloned (instead of using Object.create),
		// otherwise properties inside other objects won't be saved into the config file,
		// as JSON.stringify doesn't stringify properties in object prototypes
		this.prefs = structuredClone(PREFS_DEFAULT);

		if (loaded_prefs !== undefined) {
			deep_assign(this.prefs, loaded_prefs);
		}

		/** @type {Promise<any>[]} */
		const reqs = [];

		for (const type of GM_CHANNEL_TYPES) {

			const options = this.prefs.runtime_opts.type_opts[type];

			reqs.push(this.runtime_list_load_type(type)
				.then((res) => {

					if (!res.ok) {
						// Silently drop. Users don't care if a GM version they don't use couldn't be
						// found!
						options.choice = null;
						return;
					}

					const runtimes_found = res.data;

					if (options.choice === null && runtimes_found.length > 0) {
						options.choice = runtimes_found[0].version.toString();
					}

					runtimes[type] = runtimes_found;

				}));
				
			reqs.push(this.user_list_load_type(type)
				.then((result) => {

					if (!result.ok) {
						options.user = null;
						return;
					}

					const users_found = result.data;

					if (options.user === null && users_found.length > 0) {
						options.user = users_found[0].name.toString();
					}
					
					users[type] = users_found;

				}));
			
		}

		await Promise.all(reqs);
		this.__ready__ = true;

		return { ok: true };
	}

	/**
	 * Called on deregistering the plugin.
	 */
	static __cleanup__() {
		return;
	}

}
