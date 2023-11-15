import { def_runtime_paths, igorPath } from '../compiler/igor.js';
import { fileExists, readFile, readdir, writeFile } from '../utils.js';

/**
 * Handler for plugin preferences file, asnd
 * project-specific preferences handling.
 */
export class Preferences {

    /** @type {PreferencesData} */
    #prefs = {
        runtime_opts: {
            // Default runtime to use is probably going to be stable.
            type: 'stable',

            type_opts: {
                stable: {
                    search_path: def_runtime_paths.stable,
                    choice: null
                },
                beta: {
                    search_path: def_runtime_paths.beta,
                    choice: null
                }
            }
        }
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

        // We trust the user hasn't messed with the JSON file... or else!
        Object.assign(this.#prefs, loaded_prefs);

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
     * @returns {Promise<Result<RuntimeInfo[], Error>>}
     */
    async loadRuntimeList(type = this.globalRuntimeType) {
        const opts = this.getGlobalRuntimeTypeOpts(type);
        const dir_res = await readdir(opts.search_path);

        if ('err' in dir_res) {
            return { err: dir_res.err, msg: `Failed to read search path "${opts.search_path}"` };
        }

        const igor_path_segment = igorPath(this.#join_path);

        const runtimes = dir_res.data
            .map(dirname => {
                const path = this.#join_path(opts.search_path, dirname);
                const igor_path = this.#join_path(path, igor_path_segment);

                return {
                    path,
                    igor_path,
                    version: dirname
                };
            });

        // Search each result to check if its a valid runtime.
        // This 99% isn't required, but I wanted to do it anyway :)
        const valid = await Promise.all(
            runtimes
                .map(runtime => fileExists(runtime.igor_path))
        );

        return {
            data: runtimes
            .filter((_, i) => valid[i])
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

            if ('data' in res) {
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