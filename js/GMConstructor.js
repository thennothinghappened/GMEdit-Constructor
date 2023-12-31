import { CompileController } from './compiler/CompileController.js';
// import { PreferencesMenu } from './preferences/PreferencesMenu.js';
import { Menu } from './Menu.js';
import { getCurrentProject, saveOpenFiles } from './utils/editor.js';
import { Preferences } from './preferences/Preferences.js';
import { PreferencesMenu } from './preferences/PreferencesMenu.js';

/**
 * Main controller instance for the plugin!
 */
export class GMConstructor {

    /** Name of the plugin */
    plugin_name;
    /** Current plugin version */
    plugin_version;

    /**
     * Container for our preferences!
     * @type {Preferences}
     */
    preferences;

    /**
     * List of runtimes for each type.
     * Populated after loading the list.
     * 
     * @type { { stable: RuntimeInfo[]?, beta: RuntimeInfo[]? } }
     */
    runtimes;

    /**
     * Controller and handler for compile jobs.
     * 
     * @type {CompileController}
     */
    compileController;

    /**
     * Quick actions menu.
     * 
     * @type {Menu}
     */
    menu;

    /**
     * @param {string} plugin_name Name of the plugin - redundant, but saves typing it everywhere.
     * @param {string} plugin_version Current version of the plugin
     * @param {Preferences} preferences Plugin preferences.
     * @param {CompileController} compileController
     * @param {{ stable: RuntimeInfo[]?, beta: RuntimeInfo[]? }} runtimes 
     */
    constructor(
        plugin_name,
        plugin_version,
        preferences,
        compileController,
        runtimes
    ) {
        this.plugin_name = plugin_name;
        this.plugin_version = plugin_version;

        this.preferences = preferences;

        this.compileController = compileController;

        this.runtimes = runtimes;

        this.menu = new Menu(
            this.compileCurrent,
            this.cleanCurrent,
            this.runCurrent
        );

        this.prefsMenu = new PreferencesMenu(
            plugin_name,
            plugin_version,

            () => this.preferences.globalRuntimeType,

            (type) => this.runtimes[type]
                ?.map(runtime => runtime.version) ?? [],

            (type) => this.preferences
                .getGlobalRuntimeTypeOpts(type).choice ?? null,

            (type) => this.preferences
                .getGlobalRuntimeTypeOpts(type).search_path,

            async (type, search_path) => {
                this.preferences.setRuntimeSearchPath(type, search_path);
                await this.preferences.save();
                
                this.runtimes[type] = null;

                const res = await this.preferences.loadRuntimeList(type);

                if ('err' in res) {
                    console.error('Failed to load runtime list:', res.msg, res.err);
                    return;
                }

                this.runtimes[type] = res.data;

                const choice = this.preferences.getGlobalRuntimeTypeOpts(type).choice;

                if (
                    choice !== undefined && 
                    this.runtimes[type]?.find(runtimeInfo => runtimeInfo.version === choice) === undefined
                ) {
                    console.warn(`Runtime version "${choice}" not available in new search path "${search_path}".`);
                    this.preferences.setGlobalRuntimeChoice(type, this.runtimes[type]?.at(0)?.version ?? null);
                }
            },

            async (type, choice) => {
                this.preferences.setGlobalRuntimeChoice(type, choice);
                await this.preferences.save();
            },

            async (type) => {
                this.preferences.setGlobalRuntimeType(type);
                await this.preferences.save();
            },

            () => this.preferences.saveOnRunTask,

            async (save_on_run_task) => {
                this.preferences.saveOnRunTask = save_on_run_task;
                await this.preferences.save();
            }
        );
    }

    /**
     * Run a task on a given (or current) project.
     * @param {IgorVerb} verb
     * @param {GMLProject} [project] 
     */
    #runTask(verb, project = getCurrentProject()) {

        if (project === undefined) {
            return;
        }

        const runtime_res = this.#getProjectRuntime(project);

        if ('err' in runtime_res) {
            console.error('Failed to find runtime for project:', runtime_res.err, runtime_res.msg);
            return;
        }

        if (this.preferences.saveOnRunTask) {
            saveOpenFiles();
        }

        const res = this.compileController.runJob(project, runtime_res.data, {
            verb,
            mode: 'VM'
        });

        if ('err' in res) {
            console.error(res.msg);
            return;
        }

        this.compileController.openEditorForJob(res.data);
    }

    /**
     * Get the runtime to use for a given project.
     * @param {GMLProject} proj 
     * @returns {Result<RuntimeInfo, 'No valid runtimes found'>}
     */
    #getProjectRuntime(proj) {
        // TODO: we currently just grab the global.
        
        const desired_runtime_list = this.runtimes[this.preferences.globalRuntimeType];

        if (desired_runtime_list === null) {
            
            return {
                err: 'No valid runtimes found',
                msg: `Runtime type ${this.preferences.globalRuntimeType} list not loaded!`
            };
        }

        const version = this.preferences.getGlobalRuntimeTypeOpts().choice ?? desired_runtime_list[0]?.version;
        const runtime = desired_runtime_list.find(runtime => runtime.version === version);

        if (runtime === undefined) {
            return {
                err: 'No valid runtimes found',
                msg: `Failed to find any runtimes of type ${this.preferences.globalRuntimeType}`
            };
        }

        return { data: runtime };
    }

    compileCurrent = () => {
        this.#runTask('Package');
    }

    cleanCurrent = () => {
        this.#runTask('Clean');
    }

    runCurrent = () => {
        this.#runTask('Run');
    }

    /**
     * Create an instance of the plugin.
     * @param {string} plugin_name Name of the plugin - redundant, but saves typing it everywhere.
     * @param {string} plugin_version Current version of the plugin
     * @param {import('node:path')} node_path 
     * @param {import('node:child_process')} node_child_process
     */
    static async create(plugin_name, plugin_version, node_path, node_child_process) {

        // Setting up preferences //
        const preferences = await Preferences.create(node_path.join, plugin_name);

        const stable_req = preferences.loadRuntimeList('stable');
        const beta_req = preferences.loadRuntimeList('beta');

        const [stable_res, beta_res] = await Promise.all([stable_req, beta_req]);

        /**
         * @type { { stable: RuntimeInfo[]?, beta: RuntimeInfo[]? } }
         */
        const runtimes = {
            stable: null,
            beta: null
        };

        if ('err' in stable_res) {
            console.warn('Failed to load stable runtimes list:', stable_res.msg, stable_res.err);

            if (preferences.globalRuntimeType === 'stable' && !('err' in beta_res)) {
                console.warn('Switched to Beta runtimes');

                preferences.setGlobalRuntimeType('beta');
                await preferences.save();
            }
        } else {
            runtimes.stable = stable_res.data;
        }

        if ('err' in beta_res) {
            console.warn('Failed to load beta runtimes list:', beta_res.msg, beta_res.err);

            if (preferences.globalRuntimeType === 'beta' && !('err' in stable_res)) {
                console.warn('Switched to Stable runtimes');

                preferences.setGlobalRuntimeType('stable');
                await preferences.save();
            }
        } else {
            runtimes.beta = beta_res.data;
        }

        // Setting up compilation //
        const compile_controller = new CompileController(node_child_process.spawn);

        return new GMConstructor(plugin_name, plugin_version, preferences, compile_controller, runtimes);
    }

    /**
     * Called on deregistering the plugin.
     */
    async cleanup() {

        this.preferences.cleanup();
        this.compileController.cleanup();
        this.menu.cleanup();
        
    }

}
