/**
 * Handler for plugin preferences file
 * and runtime list.
 */

import { def_runtime_paths, igor_path_segment } from '../compiler/igor-paths.js';
import { fileExists, readFile, readdir, writeFile } from '../utils/file.js';
import { Err } from '../utils/Err.js';
import { join_path, plugin_name } from '../GMConstructor.js';
import { runtime_version_parse } from '../compiler/RuntimeVersion.js';

/** @type {RuntimeType[]} */
export const valid_runtime_types = ['Stable', 'Beta', 'LTS'];

/** @type {PreferencesData} */
const prefs = {
    runtime_opts: {
        // Default runtime to use is probably going to be stable.
        type: 'Stable',

        type_opts: {
            Stable: {
                search_path: def_runtime_paths.Stable,
                choice: null
            },
            Beta: {
                search_path: def_runtime_paths.Beta,
                choice: null
            },
            LTS: {
                search_path: def_runtime_paths.LTS,
                choice: null
            }
        }
    },

    save_on_run_task: true,
    reuse_compiler_tab: true,
};

/**
 * List of runtimes for each type.
 * Populated after loading the list.
 * 
 * @type { { [key in RuntimeType]: RuntimeInfo[]? } }
 */
const runtimes = {
    Stable: null,
    Beta: null,
    LTS: null
};

/**
 * Path preferences are saved to.
 * @type {string}
 */
let save_path;

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
 * The default runtime type used globally.
 */
export function global_runtime_type_get() {
    return prefs.runtime_opts.type;
}

/**
 * The default runtime type used globally.
 * @param {RuntimeType} type 
 */
export function global_runtime_type_set(type) {
    prefs.runtime_opts.type = type;
    return save();
}

/**
 * Get the global choice for default runtime for a given type.
 * @param {RuntimeType} type 
 */
export function global_runtime_choice_get(type) {
    return prefs.runtime_opts.type_opts[type].choice;
}

/**
 * Set the global choice for default runtime for a given type.
 * @param {RuntimeType} type 
 * @param {string?} choice 
 */
export function global_runtime_choice_set(type, choice) {
    prefs.runtime_opts.type_opts[type].choice = choice;
    return save();
}

/**
 * Get the search path for runtime of a given type.
 *  @param {RuntimeType} type 
 */
export function runtime_search_path_get(type) {
    return prefs.runtime_opts.type_opts[type].search_path;
}

/**
 * Function to get a list of runtime version names for a given runtime type.
 * @param {RuntimeType} type
 * @returns {RuntimeInfo[]?}
 */
export function runtime_versions_get_for_type(type) {
   return runtimes[type];
};

/**
 * Set the search path for runtime of a given type.
 * @param {RuntimeType} type 
 * @param {string} search_path 
 */
export async function runtime_search_path_set(type, search_path) {

    prefs.runtime_opts.type_opts[type].search_path = search_path;
    await save();

    runtimes[type] = null;

    const res = await runtime_list_load_type(type);

    if (!res.ok) {
        console.error(`Failed to load runtime list: ${res.err}`);
        return;
    }

    runtimes[type] = res.data;

    const choice = global_runtime_choice_get(type);

    if (
        choice !== undefined && 
        runtimes[type]?.find(runtimeInfo => runtimeInfo.version.toString() === choice) === undefined
    ) {
        console.warn(`Runtime version "${choice}" not available in new search path "${search_path}".`);
        global_runtime_choice_set(type, runtimes[type]?.at(0)?.version?.toString() ?? null);
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
 * @param {RuntimeType} type 
 */
function global_runtime_opts_get(type = global_runtime_type_get()) {
    return prefs.runtime_opts.type_opts[type];
}

/**
 * Load the list of runtimes for the provided search path for a type.
 * @param {RuntimeType} [type] 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_type(type = global_runtime_type_get()) {

    const { search_path } = global_runtime_opts_get(type);
    return runtime_list_load_path(search_path);
}

/**
 * Load the list of runtimes for the provided search path.
 * @param {String} search_path 
 * @returns {Promise<Result<RuntimeInfo[]>>}
 */
async function runtime_list_load_path(search_path) {

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

            const version_res = runtime_version_parse(dirname);

            if (!version_res.ok) {

                const err = new Err(`Failed to parse runtime version name for runtime at '${path}'`, version_res.err);
                console.warn(err.toString());

                return null;
            }

            return {
                path,
                igor_path,
                version: version_res.data
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
            } catch (err) {
                console.error(`Failed to read preferences: ${err}`);
            }
        } else {
            console.error(`Failed to read preferences: ${res.err}`);
        }
    }

    if (loaded_prefs?.runtime_opts?.type !== undefined) {
        if (!valid_runtime_types.includes(loaded_prefs.runtime_opts.type)) {

            console.warn(`Found invalid preferred runtime type '${loaded_prefs.runtime_opts.type}', changed to ${prefs.runtime_opts.type}`);
            loaded_prefs.runtime_opts.type = prefs.runtime_opts.type;

        }
    }

    if (loaded_prefs?.runtime_opts?.type_opts !== undefined) {

        const type_opts = loaded_prefs?.runtime_opts?.type_opts;

        for (const type of valid_runtime_types) {

            if (!(type in type_opts)) {

                console.warn(`Missing runtime type preference data for type '${type}', replacing with default.`);
                loaded_prefs.runtime_opts.type_opts[type] = prefs.runtime_opts.type_opts[type];

            }
        }

    }
    
    Object.assign(prefs, loaded_prefs);

    const stable_req = runtime_list_load_type('Stable');
    const beta_req = runtime_list_load_type('Beta');
    const lts_req = runtime_list_load_type('LTS');

    const [stable_res, beta_res, lts_res] = await Promise.all([stable_req, beta_req, lts_req]);

    if (stable_res.ok) {
        runtimes.Stable = stable_res.data;
    } else {
        console.debug(`Failed to load Stable runtimes list: ${stable_res.err}`);
    }

    if (beta_res.ok) {
        runtimes.Beta = beta_res.data;
    } else {
        console.debug(`Failed to load Beta runtimes list: ${beta_res.err}`);
    }

    if (lts_res.ok) {
        runtimes.LTS = lts_res.data;
    } else {
        console.debug(`Failed to load LTS runtimes list: ${lts_res.err}`);
    }

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
