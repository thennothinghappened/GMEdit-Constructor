import { CompileController } from './compiler/CompileController.js';
// import { PreferencesMenu } from './preferences/PreferencesMenu.js';
import { Menu } from './Menu.js';
import { getCurrentProject, saveOpenFiles } from './utils/editor.js';
import { Preferences } from './preferences/Preferences.js';
import { PreferencesMenu } from './preferences/PreferencesMenu.js';
import { Err } from './utils/Err.js';

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
     * @type { { [key in RuntimeType]: RuntimeInfo[]? } }
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
     * @param {{ [key in RuntimeType]: RuntimeInfo[]? }} runtimes 
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
                ?.map(runtime => runtime.version.toString()) ?? [],

            (type) => this.preferences
                .getGlobalRuntimeTypeOpts(type).choice ?? null,

            (type) => this.preferences
                .getGlobalRuntimeTypeOpts(type).search_path,

            async (type, search_path) => {
                this.preferences.setRuntimeSearchPath(type, search_path);
                await this.preferences.save();
                
                this.runtimes[type] = null;

                const res = await this.preferences.loadRuntimeList(type);

                if (!res.ok) {
                    console.error('Failed to load runtime list:', res.err);
                    return;
                }

                this.runtimes[type] = res.data;

                const choice = this.preferences.getGlobalRuntimeTypeOpts(type).choice;

                if (
                    choice !== undefined && 
                    this.runtimes[type]?.find(runtimeInfo => runtimeInfo.version.toString() === choice) === undefined
                ) {
                    console.warn(`Runtime version "${choice}" not available in new search path "${search_path}".`);
                    this.preferences.setGlobalRuntimeChoice(type, this.runtimes[type]?.at(0)?.version?.toString() ?? null);
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
            },

            () => this.preferences.reuseCompilerTab,

            async (reuse_compiler_tab) => {
                this.preferences.reuseCompilerTab = reuse_compiler_tab;
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

        if (!runtime_res.ok) {
            console.error('Failed to find runtime for project:', runtime_res.err);
            return;
        }

        if (this.preferences.saveOnRunTask) {
            saveOpenFiles();
        }

        const res = this.compileController.runJob(project, runtime_res.data, {
            verb,
            mode: 'VM'
        });

        if (!res.ok) {
            console.error('Failed to run Igor job:', res.err);
            return;
        }

        this.compileController.openEditorForJob(res.data, this.preferences.reuseCompilerTab);
    }

    /**
     * Get the runtime to use for a given project.
     * @param {GMLProject} proj 
     * @returns {Result<RuntimeInfo>}
     */
    #getProjectRuntime(proj) {
        // TODO: we currently just grab the global.
        
        const desired_runtime_list = this.runtimes[this.preferences.globalRuntimeType];

        if (desired_runtime_list === null) {
            
            return {
                ok: false,
                err: new Err(`Runtime type ${this.preferences.globalRuntimeType} list not loaded!`)
            };
        }

        const version = this.preferences.getGlobalRuntimeTypeOpts().choice ?? desired_runtime_list[0]?.version.toString();
        const runtime = desired_runtime_list.find(runtime => runtime.version.toString() === version.toString());

        if (runtime === undefined) {
            return {
                ok: false,
                err: new Err(`Failed to find any runtimes of type ${this.preferences.globalRuntimeType}`)
            };
        }

        return {
            ok: true,
            data: runtime
        };
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

        const stable_req = preferences.loadRuntimeList('Stable');
        const beta_req = preferences.loadRuntimeList('Beta');
        const lts_req = preferences.loadRuntimeList('LTS');

        const [stable_res, beta_res, lts_res] = await Promise.all([stable_req, beta_req, lts_req]);

        /**
         * @type { { [key in RuntimeType]: RuntimeInfo[]? } }
         */
        const runtimes = {
            Stable: null,
            Beta: null,
            LTS: null
        };

        if (stable_res.ok) {
            runtimes.Stable = stable_res.data;
        } else {
            console.debug('Failed to load Stable runtimes list', stable_res.err);
        }

        if (beta_res.ok) {
            runtimes.Beta = beta_res.data;
        } else {
            console.debug('Failed to load Beta runtimes list', beta_res.err);
        }

        if (lts_res.ok) {
            runtimes.LTS = lts_res.data;
        } else {
            console.debug('Failed to load LTS runtimes list', lts_res.err);
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
