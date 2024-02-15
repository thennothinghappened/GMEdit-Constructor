import { def_runtime_paths, igorPath, runtime_version_parse } from '../utils/igor.js';
import { fileExists, readFile, readdir, writeFile } from '../utils/file.js';
import { Err } from '../utils/Err.js';

/** @type {RuntimeType[]} */
export const valid_runtime_types = ['Stable', 'Beta', 'LTS'];

/**
 * Handler for plugin preferences file, asnd
 * project-specific preferences handling.
 */
export class Preferences {

    /** @type {PreferencesData} */
    #prefs = {
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
     * Path preferences are saved to.
     * 
     * @type {string}
     */
    #save_path;

    /**
     * Reference to NodeJS path join.
     * @type {import('node:path').join}
     */
    #join_path;

    /**
     * @param {import('node:path').join} join_path NodeJS path join
     * @param {string} save_path Path to save the file to when saving preferences.
     * @param {Partial<PreferencesData>} [loaded_prefs] Preferences data loaded from the file.
     */
    constructor(join_path, save_path, loaded_prefs) {

        this.#join_path = join_path;
        this.#save_path = save_path;

        if (loaded_prefs?.runtime_opts?.type !== undefined) {
            if (!valid_runtime_types.includes(loaded_prefs.runtime_opts.type)) {

                console.warn(`Found invalid preferred runtime type '${loaded_prefs.runtime_opts.type}', changed to ${this.#prefs.runtime_opts.type}`);
                loaded_prefs.runtime_opts.type = this.#prefs.runtime_opts.type;

            }
        }

        if (loaded_prefs?.runtime_opts?.type_opts !== undefined) {

            const type_opts = loaded_prefs?.runtime_opts?.type_opts;

            for (const type of valid_runtime_types) {

                if (!(type in type_opts)) {

                    console.warn(`Missing runtime type preference data for type '${type}', replacing with default.`);
                    loaded_prefs.runtime_opts.type_opts[type] = this.#prefs.runtime_opts.type_opts[type];

                }
            }

        }
        
        Object.assign(this.#prefs, loaded_prefs);

    }

    get saveOnRunTask() {
        return this.#prefs.save_on_run_task;
    }

    set saveOnRunTask(save_on_run_task) {
        this.#prefs.save_on_run_task = save_on_run_task;
    }

    get reuseCompilerTab() {
        return this.#prefs.save_on_run_task;
    }

    set reuseCompilerTab(reuse_compiler_tab) {
        this.#prefs.reuse_compiler_tab = reuse_compiler_tab;
    }

    /**
     * The default runtime type used globally.
     */
    get globalRuntimeType() {
        return this.#prefs.runtime_opts.type;
    }

    /**
     * The default runtime type used globally.
     * @param {RuntimeType} type 
     */
    setGlobalRuntimeType(type) {
        this.#prefs.runtime_opts.type = type;
    }

    /**
     * Set the global choice for default runtime for a given type.
     * @param {RuntimeType} type 
     * @param {string?} choice 
     */
    setGlobalRuntimeChoice(type, choice) {
        this.#prefs.runtime_opts.type_opts[type].choice = choice;
    }

    /**
     * Set the search path for runtime of a given type.
     * @param {RuntimeType} type 
     * @param {string} search_path 
     */
    setRuntimeSearchPath(type, search_path) {
        this.#prefs.runtime_opts.type_opts[type].search_path = search_path;
    }

    /**
     * Get the global runtime options for a given runtime type.
     * @param {RuntimeType} type 
     */
    getGlobalRuntimeTypeOpts(type = this.globalRuntimeType) {
        return this.#prefs.runtime_opts.type_opts[type];
    }

    /**
     * Load the list of runtimes for the provided search path for a type.
     * @param {RuntimeType} [type] 
     * @returns {Promise<Result<RuntimeInfo[]>>}
     */
    async loadRuntimeList(type = this.globalRuntimeType) {
        
        const opts = this.getGlobalRuntimeTypeOpts(type);
        const dir_res = await readdir(opts.search_path);

        if (!dir_res.ok) {
            return {
                ok: false,
                err: new Err(`Failed to read search path '${opts.search_path}'`, dir_res.err),
            };
        }

        const igor_path_segment = igorPath(this.#join_path);

        /** @type {RuntimeInfo[]} */
        // @ts-thanks-for-epic-type-inference-it-really-works-here
        // @ts-ignore
        const runtimes = dir_res.data
            .map(dirname => {

                const path = this.#join_path(opts.search_path, dirname);
                const igor_path = this.#join_path(path, igor_path_segment);

                const version_res = runtime_version_parse(dirname);

                if (!version_res.ok) {

                    console.error(version_res.err);
                    return null;
                }

                return {
                    path,
                    igor_path,
                    version: version_res.data
                };

            })
            .filter(runtime => runtime !== null)
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
     * Save preferences back to the file.
     */
    async save() {
        return await writeFile(this.#save_path, JSON.stringify(this.#prefs));
    }

    /**
     * Init a new instance of Preferences asynchronously (requires loading file.)
     * @param {import('node:path').join} join_path 
     * @param {string} plugin_name 
     */
    static async create(join_path, plugin_name) {
        const save_path = join_path(Electron_App.getPath('userData'), 'GMEdit', 'config', `${plugin_name}.json`);
        let loaded_prefs = undefined;

        if (await fileExists(save_path)) {

            const res = await readFile(save_path);

            if (res.ok) {
                try {
                    loaded_prefs = JSON.parse(res.data);
                } catch (err) {
                    console.error('Failed to read preferences:', err);
                }
            } else {
                console.error('Failed to read preferences:', res.err);
            }
        }

        return new Preferences(join_path, save_path, loaded_prefs);
    }

    /**
     * Called on deregistering the plugin.
     */
    cleanup() {
        return;
    }

}