import { CompileController } from './compiler/CompileController.js';
// import { PreferencesMenu } from './preferences/PreferencesMenu.js';
import { HamburgerOptions } from './HamburgerOptions.js';
import { getCurrentProject, saveOpenFiles } from './utils/editor.js';
import * as preferences from './preferences/Preferences.js';
import * as igor from './utils/igor.js';
import { PreferencesMenu } from './preferences/PreferencesMenu.js';
import { Err } from './utils/Err.js';
import { ConstructorControlPanel } from './editors/ConstructorControlPanel.js';

/**
 * Name of the plugin 
 * @type {String}
 */
export let plugin_name;

/**
 * Current plugin version
 * @type {String}
 */
export let plugin_version;

/**
 * Main controller instance for the plugin!
 */
export class GMConstructor {

    /**
     * Controller and handler for compile jobs.
     * 
     * @type {CompileController}
     */
    compileController;

    /**
     * Quick actions menu.
     * 
     * @type {HamburgerOptions}
     */
    menu;

    /**
     * @param {CompileController} compileController
     */
    constructor(compileController) {

        this.compileController = compileController;

        this.menu = new HamburgerOptions(
            this.onControlPanel,
            this.compileCurrent,
            this.cleanCurrent,
            this.runCurrent
        );

        this.prefsMenu = new PreferencesMenu();
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
            console.error(`Failed to find runtime for project: ${runtime_res.err}`);
            return;
        }

        if (preferences.save_on_run_task_get()) {
            saveOpenFiles();
        }

        const res = this.compileController.runJob(project, runtime_res.data, {
            verb,
            mode: 'VM'
        });

        if (!res.ok) {
            console.error(`Failed to run Igor job: ${res.err}`);
            return;
        }

        this.compileController.openEditorForJob(res.data, preferences.reuse_compiler_tab_get());
    }

    /**
     * Get the runtime to use for a given project.
     * @param {GMLProject} proj 
     * @returns {Result<RuntimeInfo>}
     */
    #getProjectRuntime(proj) {

        // TODO: we currently just grab the global.
        
        const type = preferences.global_runtime_type_get();
        const desired_runtime_list = preferences.runtime_versions_get_for_type(type);

        if (desired_runtime_list === null) {
            return {
                ok: false,
                err: new Err(`Runtime type ${type} list not loaded!`)
            };
        }

        const version = preferences.global_runtime_choice_get(type) ?? desired_runtime_list[0]?.version?.toString();
        const runtime = desired_runtime_list.find(runtime => runtime.version.toString() === version);

        if (runtime === undefined) {
            return {
                ok: false,
                err: new Err(`Failed to find any runtimes of type ${type}`)
            };
        }

        return {
            ok: true,
            data: runtime
        };
    }

    onControlPanel = () => {
        ConstructorControlPanel.view();
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
     * @param {string} _plugin_name Name of the plugin - redundant, but saves typing it everywhere.
     * @param {string} _plugin_version Current version of the plugin
     * @param {import('node:path')} node_path 
     * @param {import('node:child_process')} node_child_process
     */
    static async create(_plugin_name, _plugin_version, node_path, node_child_process) {

        join_path = node_path.join;
        igor.__setup__();

        plugin_name = _plugin_name;
        plugin_version = _plugin_version;

        // Setting up preferences //
        const preferences_res = await preferences.__setup__();

        if (!preferences_res.ok) {
            return {
                ok: false,
                err: new Err('Failed to init preferences', preferences_res.err)
            };
        }

        // Setting up compilation //
        const compile_controller = new CompileController(node_child_process.spawn);

        return {
            ok: true,
            data: new GMConstructor(compile_controller)
        };
    }

    /**
     * Called on deregistering the plugin.
     */
    async cleanup() {

        preferences.cleanup();
        this.compileController.cleanup();
        this.menu.cleanup();
        
    }

}

/**
 * Reference to NodeJS path join.
 * @type {import('node:path').join}
 */
export let join_path;