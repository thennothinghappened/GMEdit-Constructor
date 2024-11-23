/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_global_build_path, def_runtime_paths, def_user_paths, igor_path_segment } from '../compiler/igor-paths.js';
import { fileExists, readFile, readdir, writeFile } from '../utils/file.js';
import { Err } from '../utils/Err.js';
import { deep_assign } from '../utils/object.js';
import { join_path, plugin_name } from '../GMConstructor.js';
import { runtime_version_parse } from '../compiler/RuntimeVersion.js';
import { ConstructorControlPanel } from '../ui/editors/ConstructorControlPanel.js';

/**
 * List of recognised GameMaker IDE/Runtime channel types.
 * @type {GMChannelType[]} 
 */
export const gm_channel_types = ['Stable', 'Beta', 'LTS'];

/** @type {RunnerType[]} */
export const valid_runner_types = ['VM', 'YYC'];

/** @type {Readonly<PreferencesData>} */
const prefs_default = {
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

/** @type {PreferencesData} */
let prefs = Object.create(prefs_default);

/**
 * List of runtimes for each type.
 * Populated after loading the list.
 * 
 * @type { { [key in GMChannelType]: RuntimeInfo[]? } }
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
 * @type { { [key in GMChannelType]: UserInfo[]? } }
 */
const users = {
	Stable: null,
	Beta: null,
	LTS: null
};

/**
 * Path preferences are saved to.
 * @type {string}
 */
let save_path;

let __ready__ = false;

/**
 * Returns whether the preferences are loaded.
 */
export function ready() {
	return __ready__;
}

/**
 * Get whether to reuse a compiler tab.
 * @returns {Boolean}
 */
export function reuse_compiler_tab_get() {
	return prefs.reuse_compiler_tab;
}

/**
 * Set whether to reuse a compiler tab.
 * @param {Boolean} reuse_compiler_tab 
 */
export function reuse_compiler_tab_set(reuse_compiler_tab) {
	prefs.reuse_compiler_tab = reuse_compiler_tab;
	return save();
}

/**
 * Get whether to save all files on running a task.
 * @returns {Boolean}
 */
export function save_on_run_task_get() {
	return prefs.save_on_run_task;
}

/**
 * Set whether to save all files on running a task.
 * @param {Boolean} save_on_run_task 
 */
export function save_on_run_task_set(save_on_run_task) {
	prefs.save_on_run_task = save_on_run_task;
	return save();
}

/**
 * Get whether we should automatically check for updates on startup.
 * @returns {Boolean}
 */
export function update_check_get() {
	return prefs.check_for_updates;
}

/**
 * Set whether we should automatically check for updates on startup.
 * @param {Boolean} check_for_updates 
 */
export function update_check_set(check_for_updates) {
	prefs.check_for_updates = check_for_updates;
	return save();
}

/**
 * Get whether to use the global build directory.
 * @returns {Boolean}
 */
export function use_global_build_get() {
	return prefs.use_global_build;
}

/**
 * Set whether to use the global build directory.
 * @param {Boolean} use_global_build 
 */
export function use_global_build_set(use_global_build) {
	prefs.use_global_build = use_global_build;
	return save();
}

/**
 * Get the global build directory path.
 * @returns {String}
 */
export function global_build_path_get() {
	return prefs.global_build_path;
}

/**
 * Set the global build directory path.
 * @param {String} global_build_path 
 */
export function global_build_path_set(global_build_path) {
	prefs.global_build_path = global_build_path;
	return save();
}

/**
 * Get the desired runner type.
 * @returns {RunnerType}
 */
export function runner_get() {
	return prefs.runtime_opts.runner;
}

/**
 * The default runner type used globally.
 * @param {RunnerType} runner 
 */
export function runner_set(runner) {

	prefs.runtime_opts.runner = runner;
	return save();

}

/**
 * The default runtime type used globally.
 */
export function runtime_channel_type_get() {
	return prefs.runtime_opts.type;
}

/**
 * The default runtime type used globally.
 * @param {GMChannelType} type 
 */
export function runtime_channel_type_set(type) {
	prefs.runtime_opts.type = type;
	return save();
}

/**
 * Get the global choice for default runtime for a given type.
 * @param {GMChannelType} [type] 
 */
export function runtime_version_get(type = runtime_channel_type_get()) {
	return prefs.runtime_opts.type_opts[type].choice;
}

/**
 * Set the global choice for default runtime for a given type.
 * @param {GMChannelType} type 
 * @param {string?} choice 
 */
export function runtime_version_set(type, choice) {
	prefs.runtime_opts.type_opts[type].choice = choice;
	return save();
}

/**
 * Get the global choice for default user for a given type.
 * @param {GMChannelType} [type] 
 */
export function user_get(type = runtime_channel_type_get()) {
	return prefs.runtime_opts.type_opts[type].user;
}

/**
 * Set the global choice for default runtime for a given type.
 * @param {GMChannelType} type 
 * @param {string?} user 
 */
export function user_set(type, user) {
	prefs.runtime_opts.type_opts[type].user = user;
	return save();
}

/**
 * Get the search path for runtime of a given type.
 *  @param {GMChannelType} type 
 */
export function runtime_search_path_get(type) {
	return prefs.runtime_opts.type_opts[type].search_path;
}

/**
 * Get the users path for runtime of a given type.
 *  @param {GMChannelType} type 
 */
export function users_search_path_get(type) {
	return prefs.runtime_opts.type_opts[type].users_path;
}

/**
 * Function to get a list of runtime version names for a given runtime type.
 * @param {GMChannelType} type
 * @returns {RuntimeInfo[]?}
 */
export function runtime_versions_get_for_type(type) {
   return runtimes[type];
};

/**
 * Function to get a list of user names for a given runtime type.
 * @param {GMChannelType} type
 * @returns {UserInfo[]?}
 */
export function users_get_for_type(type) {
   return users[type];
};

/**
 * Set the search path for runtime of a given type.
 * @param {GMChannelType} type 
 * @param {string} search_path 
 */
export async function runtime_search_path_set(type, search_path) {

	prefs.runtime_opts.type_opts[type].search_path = search_path;
	await save();

	runtimes[type] = null;

	const res = await runtime_list_load_type(type);

	if (!res.ok) {

		const err = new Err(
			`Failed to load ${type} runtime list`,
			res.err,
			'Make sure the search path is valid!'
		);

		return ConstructorControlPanel
			.view(true)
			.showError(err.message, err);
	}

	runtimes[type] = res.data;

	const choice = runtime_version_get(type);

	if (
		choice !== undefined && 
		runtimes[type]?.find(runtimeInfo => runtimeInfo.version.toString() === choice) === undefined
	) {

		const err = new Err(
			`Runtime version "${choice}" not available in new search path "${search_path}".`,
			undefined,
			`Is the path correct? Have you deleted the runtime "${choice}"?`,
			'Chosen Runtime version not available.'
		);

		ConstructorControlPanel
			.view(false)
			.showDebug(err.title ?? '', err);
		
		runtime_version_set(type, runtimes[type]?.at(0)?.version?.toString() ?? null);
	}

}

/**
 * Set the users path for runtime of a given type.
 * @param {GMChannelType} type 
 * @param {string} users_path 
 */
export async function users_search_path_set(type, users_path) {

	prefs.runtime_opts.type_opts[type].users_path = users_path;
	await save();

	users[type] = null;

	const res = await user_list_load_type(type);

	if (!res.ok) {

		const err = new Err(
			`Failed to load ${type} user list`,
			res.err,
			'Make sure the users path is valid!'
		);

		return ConstructorControlPanel
			.view(true)
			.showError(err.message, err);
	}

	users[type] = res.data;

	const choice = user_get(type);

	if (
		choice !== undefined && 
		users[type]?.find(user => user.name === choice) === undefined
	) {

		const err = new Err(`User "${choice}" not available in new users path "${users_path}".`);

		ConstructorControlPanel
			.view(false)
			.showWarning(err.message, err);
		
		user_set(type, users[type]?.at(0)?.name?.toString() ?? null);
	}

}

/**
 * Save preferences back to the file.
 */
export function save() {
	return writeFile(save_path, JSON.stringify(prefs));
}

/**
 * Get the global runtime options for a given runtime type.
 * @param {GMChannelType} type 
 */
function global_runtime_opts_get(type = runtime_channel_type_get()) {
	return prefs.runtime_opts.type_opts[type];
}

/**
 * Load the list of runtimes for the provided search path for a type.
 * @param {GMChannelType} [type] 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_type(type = runtime_channel_type_get()) {

	const { search_path } = global_runtime_opts_get(type);
	return runtime_list_load_path(type, search_path);
}

/**
 * Load the list of users for the provided users path for a type.
 * @param {GMChannelType} [type] 
 * @returns {Promise<Result<UserInfo[]>>}
 */
async function user_list_load_type(type = runtime_channel_type_get()) {

	const { users_path } = global_runtime_opts_get(type);
	return user_list_load_path(type, users_path);
}

/**
 * Load the list of runtimes for the provided search path.
 * @param {GMChannelType} type 
 * @param {String} search_path 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_path(type, search_path) {

	/**
	 * List of filenames we'll just skip as obviously invalid.
	 */
	const IGNORED_NAMES = ['.DS_Store'];

	const dir_res = await readdir(search_path);

	if (!dir_res.ok) {
		return {
			ok: false,
			err: new Err(`Failed to read search path '${search_path}': ${dir_res.err}`),
		};
	}

	/** @type {RuntimeInfo[]} */
	const runtimes = dir_res.data
		.map(dirname => {

			if (IGNORED_NAMES.includes(dirname)) {
				return null;
			}

			const path = join_path(search_path, dirname);
			const igor_path = join_path(path, igor_path_segment);

			const version_res = runtime_version_parse(type, dirname);

			if (!version_res.ok) {

				const err = new Err(`Failed to parse runtime version name for runtime at '${path}'`, version_res.err);
				ConstructorControlPanel.showWarning(err.message, err);

				return null;
			}

			const runtime = version_res.data;

			const supported_res = runtime.supported();

			if (!supported_res.ok) {

				const err = new Err(
					`Ignoring unsupported runtime ${runtime}`, 
					supported_res.err,
					`${plugin_name} only supports runtimes >2022.x, and below 2024.2[xx] currently. See stack trace for more details.`
				);
				
				ConstructorControlPanel.showDebug(err.message, err);
				
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

	// Search each result to check if its a valid runtime.
	// This 99% isn't required, but I wanted to do it anyway :)
	const valid = await Promise.all(
		runtimes.map(runtime => fileExists(runtime.igor_path))
	);

	return {
		ok: true,
		data: runtimes.filter((_, i) => valid[i])
	};
}

/**
 * Load the list of users for the provided search path.
 * @param {GMChannelType} type 
 * @param {String} users_path 
 * @returns {Promise<Result<UserInfo[]>>}
 */
async function user_list_load_path(type, users_path) {

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
				path: join_path(users_path, dirname),
				name: dirname
			};
		})
		.sort((a, b) => +(a.name > b.name));

	// Search each result to check if it's actually a valid user, or just a folder in the users folder
	// (e.g Cache).
	const valid = await Promise.all(
		users.map(
			async user => await fileExists(join_path(user.path, 'license.plist'))
				|| await fileExists(join_path(user.path, 'local_settings.json'))
		)
	);

	return {
		ok: true,
		data: users.filter((_, i) => valid[i])
	};
}

/**
 * Init a new instance of Preferences asynchronously (requires loading file.)
 * @returns {Promise<Result<void>>}
 */
export async function __setup__() {

	save_path = join_path(Electron_App.getPath('userData'), 'GMEdit', 'config', `${plugin_name}.json`);

	/** @type {Partial<PreferencesData>|undefined} */
	let loaded_prefs = undefined;

	if (await fileExists(save_path)) {

		const res = await readFile(save_path);

		if (res.ok) {

			try {
				loaded_prefs = JSON.parse(res.data.toString());
			} catch (err_cause) {

				const err = new Err(
					'Failed to read preferences', 
					err_cause,
					`Please check your preferences file (${save_path}) for syntax errors as you must have edited it manually - see stacktrace below.`
				);

				ConstructorControlPanel
					.view(true)
					.showError(err.message, err);
			}

		} else {

			const err = new Err(
				'Failed to read preferences', 
				res.err,
				`Please check your preferences file (${save_path}) for errors and ensure GMEdit has read permissions - see stacktrace below.`
			);

			ConstructorControlPanel
				.view(true)
				.showError(err.message, err);
		}
	}

	if (loaded_prefs?.runtime_opts?.type !== undefined) {
		if (!gm_channel_types.includes(loaded_prefs.runtime_opts.type)) {

			ConstructorControlPanel.showWarning(
				`Invalid preferred runtime type`,
				new Err(`'${loaded_prefs.runtime_opts.type}' is invalid, changed to ${prefs.runtime_opts.type}`)
			);
			
			loaded_prefs.runtime_opts.type = prefs.runtime_opts.type;

		}
	}

	if (loaded_prefs?.runtime_opts?.type_opts !== undefined) {

		const type_opts = loaded_prefs?.runtime_opts?.type_opts;

		for (const type of gm_channel_types) {

			if (!(type in type_opts)) {

				ConstructorControlPanel.showWarning(
					'Missing runtime type preference data',
					new Err(`Missing runtime type preference data for type '${type}', replacing with default.`)
				);
				loaded_prefs.runtime_opts.type_opts[type] = prefs.runtime_opts.type_opts[type];

			}
		}

	}
	
	// prefs_default has to be cloned (instead of using Object.create),
	// otherwise properties inside other objects won't be saved into the config file,
	// as JSON.stringify doesn't stringify properties in object prototypes
	prefs = structuredClone(prefs_default);

	if (loaded_prefs !== undefined) {
		deep_assign(prefs, loaded_prefs);
	}

	/** @type {Promise<any>[]} */
	const reqs = [];

	for (const type of gm_channel_types) {

		const options = prefs.runtime_opts.type_opts[type];

		reqs.push(runtime_list_load_type(type)
			.then((result) => {

				if (!result.ok) {

					options.choice = null;

					ConstructorControlPanel
						.showDebug(`Failed to load ${type} runtimes list`, result.err);

					return;
				}

				const runtimes_found = result.data;

				if (options.choice === null && runtimes_found.length > 0) {
					options.choice = runtimes_found[0].version.toString();
				}

				runtimes[type] = runtimes_found;

			}));
			
		reqs.push(user_list_load_type(type)
			.then((result) => {

				if (!result.ok) {

					options.user = null;

					ConstructorControlPanel
						.showDebug(`Failed to load ${type} users list`, result.err);

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

	__ready__ = true;

	return {
		ok: true,
		data: undefined
	};
}

/**
 * Called on deregistering the plugin.
 */
export function __cleanup__() {
	return;
}
