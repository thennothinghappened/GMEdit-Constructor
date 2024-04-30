/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_runtime_paths, def_user_paths, igor_path_segment } from '../compiler/igor-paths.js';
import { fileExists, readFile, readdir, writeFile } from '../utils/file.js';
import { Err } from '../utils/Err.js';
import { deep_assign } from '../utils/object.js';
import { join_path, plugin_name } from '../GMConstructor.js';
import { runtime_version_parse } from '../compiler/RuntimeVersion.js';
import { ConstructorControlPanel } from '../ui/editors/ConstructorControlPanel.js';

/** @type {RuntimeChannelType[]} */
export const valid_runtime_types = ['Stable', 'Beta', 'LTS'];

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
};

/** @type {PreferencesData} */
let prefs = Object.create(prefs_default);

/**
 * List of runtimes for each type.
 * Populated after loading the list.
 * 
 * @type { { [key in RuntimeChannelType]: RuntimeInfo[]? } }
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
 * @type { { [key in RuntimeChannelType]: UserInfo[]? } }
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
 * Get the desired runner type.
 * @returns {RunnerType}
 */
export function runner_get() {
    return prefs.runtime_opts.runner;
}

/**
 * The default runner type used globally.
 * @returns {RunnerType}
 */
export function runner_project_get() {
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
 * @param {RuntimeChannelType} type 
 */
export function runtime_channel_type_set(type) {
    prefs.runtime_opts.type = type;
    return save();
}

/**
 * Get the global choice for default runtime for a given type.
 * @param {RuntimeChannelType} [type] 
 */
export function runtime_version_get(type = runtime_channel_type_get()) {
    return prefs.runtime_opts.type_opts[type].choice;
}

/**
 * Set the global choice for default runtime for a given type.
 * @param {RuntimeChannelType} type 
 * @param {string?} choice 
 */
export function runtime_version_set(type, choice) {
    prefs.runtime_opts.type_opts[type].choice = choice;
    return save();
}

/**
 * Get the global choice for default user for a given type.
 * @param {RuntimeChannelType} [type] 
 */
export function user_get(type = runtime_channel_type_get()) {
    return prefs.runtime_opts.type_opts[type].user;
}

/**
 * Set the global choice for default runtime for a given type.
 * @param {RuntimeChannelType} type 
 * @param {string?} user 
 */
export function user_set(type, user) {
    prefs.runtime_opts.type_opts[type].user = user;
    return save();
}

/**
 * Get the search path for runtime of a given type.
 *  @param {RuntimeChannelType} type 
 */
export function runtime_search_path_get(type) {
    return prefs.runtime_opts.type_opts[type].search_path;
}

/**
 * Get the users path for runtime of a given type.
 *  @param {RuntimeChannelType} type 
 */
export function users_search_path_get(type) {
    return prefs.runtime_opts.type_opts[type].users_path;
}

/**
 * Function to get a list of runtime version names for a given runtime type.
 * @param {RuntimeChannelType} type
 * @returns {RuntimeInfo[]?}
 */
export function runtime_versions_get_for_type(type) {
   return runtimes[type];
};

/**
 * Function to get a list of user names for a given runtime type.
 * @param {RuntimeChannelType} type
 * @returns {UserInfo[]?}
 */
export function users_get_for_type(type) {
   return users[type];
};

/**
 * Set the search path for runtime of a given type.
 * @param {RuntimeChannelType} type 
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

        const err = new Err(`Runtime version "${choice}" not available in new search path "${search_path}".`);

        ConstructorControlPanel
            .view(false)
            .showWarning(err.message, err);
        
        runtime_version_set(type, runtimes[type]?.at(0)?.version?.toString() ?? null);
    }

}

/**
 * Set the users path for runtime of a given type.
 * @param {RuntimeChannelType} type 
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
 * @param {RuntimeChannelType} type 
 */
function global_runtime_opts_get(type = runtime_channel_type_get()) {
    return prefs.runtime_opts.type_opts[type];
}

/**
 * Load the list of runtimes for the provided search path for a type.
 * @param {RuntimeChannelType} [type] 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_type(type = runtime_channel_type_get()) {

    const { search_path } = global_runtime_opts_get(type);
    return runtime_list_load_path(type, search_path);
}

/**
 * Load the list of users for the provided users path for a type.
 * @param {RuntimeChannelType} [type] 
 * @returns {Promise<Result<UserInfo[]>>}
 */
async function user_list_load_type(type = runtime_channel_type_get()) {

    const { users_path } = global_runtime_opts_get(type);
    return user_list_load_path(type, users_path);
}

/**
 * Load the list of runtimes for the provided search path.
 * @param {RuntimeChannelType} type 
 * @param {String} search_path 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_path(type, search_path) {

    const dir_res = await readdir(search_path);

    if (!dir_res.ok) {
        return {
            ok: false,
            err: new Err(`Failed to read search path '${search_path}': ${dir_res.err}`),
        };
    }

    /** @type {RuntimeInfo[]} */
    // @ts-thanks-for-epic-type-inference-it-really-works-here
    // @ts-ignore
    const runtimes = dir_res.data
        .map(dirname => {

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
 * @param {RuntimeChannelType} type 
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
    // @ts-thanks-for-epic-type-inference-it-really-works-here
    // @ts-ignore
    const users = dir_res.data
        .map(dirname => {
            return {
                path: join_path(users_path, dirname),
                name: dirname
            };
        })
        .sort((a, b) => +(a.name > b.name));

    // Search each result to check if its a valid user or just a folder in the users folder.
    const valid = await Promise.all(
        users.map(user => fileExists(join_path(user.path, "local_settings.json")))
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
    let loaded_prefs = undefined;

    if (await fileExists(save_path)) {

        const res = await readFile(save_path);

        if (res.ok) {

            try {
                loaded_prefs = JSON.parse(res.data);
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
        if (!valid_runtime_types.includes(loaded_prefs.runtime_opts.type)) {

            ConstructorControlPanel.showWarning(
                `Invalid preferred runtime type`,
                new Err(`'${loaded_prefs.runtime_opts.type}' is invalid, changed to ${prefs.runtime_opts.type}`)
            );
            
            loaded_prefs.runtime_opts.type = prefs.runtime_opts.type;

        }
    }

    if (loaded_prefs?.runtime_opts?.type_opts !== undefined) {

        const type_opts = loaded_prefs?.runtime_opts?.type_opts;

        for (const type of valid_runtime_types) {

            if (!(type in type_opts)) {

                ConstructorControlPanel.showWarning(
                    'Missing runtime type preference data',
                    new Err(`Missing runtime type preference data for type '${type}', replacing with default.`)
                );
                loaded_prefs.runtime_opts.type_opts[type] = prefs.runtime_opts.type_opts[type];

            }
        }

    }
    
    prefs = structuredClone(prefs_default);
    deep_assign(prefs, loaded_prefs);

    const stable_req = runtime_list_load_type('Stable');
    const beta_req = runtime_list_load_type('Beta');
    const lts_req = runtime_list_load_type('LTS');
    const user_stable_req = user_list_load_type('Stable');
    const user_beta_req = user_list_load_type('Beta');
    const user_lts_req = user_list_load_type('LTS');

    const [
        stable_res, beta_res, lts_res,
        user_stable_res, user_beta_res, user_lts_res,
    ] = await Promise.all([stable_req, beta_req, lts_req, user_stable_req, user_beta_req, user_lts_req]);

    if (stable_res.ok) {
        runtimes.Stable = stable_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load Stable runtimes list', stable_res.err);
    }

    if (beta_res.ok) {
        runtimes.Beta = beta_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load Beta runtimes list', beta_res.err);
    }

    if (lts_res.ok) {
        runtimes.LTS = lts_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load LTS runtimes list', lts_res.err);
    }

    if (user_stable_res.ok) {
        users.Stable = user_stable_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load Stable users list', user_stable_res.err);
    }

    if (user_beta_res.ok) {
        users.Beta = user_beta_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load Beta users list', user_beta_res.err);
    }

    if (user_lts_res.ok) {
        users.LTS = user_lts_res.data;
    } else {
        ConstructorControlPanel.showDebug('Failed to load LTS users list', user_lts_res.err);
    }

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
