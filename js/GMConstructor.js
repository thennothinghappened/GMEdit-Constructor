import * as compileController from './compiler/igor-controller.js';
import { HamburgerOptions } from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get } from './utils/project.js';
import * as preferences from './preferences/Preferences.js';
import * as projectProperties from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import * as preferencesMenu from './ui/PreferencesMenu.js';
import { Err } from './utils/Err.js';
import { ConstructorControlPanel } from './ui/editors/ConstructorControlPanel.js';

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
     * Quick actions menu.
     * 
     * @type {HamburgerOptions}
     */
    hamburgerOptions;

    constructor() {

        this.hamburgerOptions = new HamburgerOptions(
            this.onControlPanel,
            this.compileCurrent,
            this.cleanCurrent,
            this.runCurrent
        );
        
    }

    /**
     * Run a task on a given (or current) project.
     * @param {IgorSettings} settings
     * @param {GMLProject} [project] 
     */
    async #runTask(settings, project = project_current_get()) {

        if (project === undefined) {
            return;
        }

        const runtime_type = projectProperties.runtime_channel_type_get();
        const runtime_res = projectProperties.runtime_get();
        const user_res = projectProperties.user_get();

        if (!runtime_res.ok) {

            const err = new Err(
                `No ${runtime_type} runtimes available to compile!`,
                runtime_res.err,
                `Try specifying a different runtime channel type below, or check the runtime search path for ${runtime_type} runtimes.`
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        const runtime = runtime_res.data;

        const supported_res = runtime.version.supportedByProject(project);

        if (!supported_res.ok) {

            const err = new Err(
                `Failed to check runtime version '${runtime.version}' is compatible with the project!`,
                supported_res.err
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        const supported = supported_res.data;

        if (!supported) {

            const err = new Err(
                `Runtime version '${runtime.version}' is not compatible with this project format!`,
                undefined,
                `This project is of format ${project_format_get(project)}, where the selected runtime is format ${runtime.version.format}. Please select a matching runtime (2024.2 and up are YYv2)`
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err);
        }

        if (preferences.save_on_run_task_get()) {
            open_files_save();
        }

        const res = await compileController.job_run(project, runtime_res.data, user_res.ok ? user_res.data : null, settings);

        if (!res.ok) {

            const err = new Err(
                `Failed to run Igor job!`,
                res.err
            );

            return ConstructorControlPanel
                .view(true)
                .showError(err.message, err)
        }

        compileController.job_open_editor(res.data, preferences.reuse_compiler_tab_get());
    }

    onControlPanel = () => {
        ConstructorControlPanel.view(true);
    }

    // yes this is VERY temporary
    compileCurrent = () => {
        this.#runTask({
            platform: igorPaths.igor_user_platform,
            verb: 'Package',
            runner: projectProperties.runner_get(),
            threads: 8,
            configName: projectProperties.config_name_get()
        });
    }

    cleanCurrent = () => {
        this.#runTask({
            platform: igorPaths.igor_user_platform,
            verb: 'Clean',
            runner: projectProperties.runner_get(),
            threads: 8,
            configName: projectProperties.config_name_get()
        });
    }

    runCurrent = () => {
        this.#runTask({
            platform: igorPaths.igor_user_platform,
            verb: 'Run',
            runner: projectProperties.runner_get(),
            threads: 8,
            configName: projectProperties.config_name_get()
        });
    }

    /**
     * Create an instance of the plugin.
     * @param {string} _plugin_name Name of the plugin - redundant, but saves typing it everywhere.
     * @param {string} _plugin_version Current version of the plugin
     * @param {import('node:path')} node_path 
     * @param {import('node:child_process')} node_child_process
     * @param {import('node:fs/promises')} node_fs
     * 
     * @returns {Promise<Result<GMConstructor>>}
     */
    static async create(_plugin_name, _plugin_version, node_path, node_child_process, node_fs) {

        // Prevent Constructor loading when running on Rosetta, since it has a bunch of issues there.
        if (rosetta_check(node_child_process.execSync)) {

            const err = new Err(`${_plugin_name} does not work correctly on Rosetta - please consider using GMEdit's native Arm64 build found at https://yellowafterlife.itch.io/gmedit`);
            console.error(err);

            Electron_Dialog.showMessageBox({
                title: 'GMEdit-Constructor cannot load on Rosetta!',
                message: err.message,
                buttons: ['Dismiss'],
                type: 'error'
            });

            return {
                ok: false,
                err: err
            };

        }

        join_path = node_path.join;
        spawn = node_child_process.spawn;
        rm = node_fs.rm;

        plugin_name = _plugin_name;
        plugin_version = _plugin_version;

        igorPaths.__setup__();

        // Setting up preferences //
        const preferences_res = await preferences.__setup__();

        if (!preferences_res.ok) {
            return {
                ok: false,
                err: new Err('Failed to init preferences', preferences_res.err)
            };
        }

        projectProperties.__setup__();
        preferencesMenu.__setup__();

        return {
            ok: true,
            data: new GMConstructor()
        };
    }

    /**
     * Called on deregistering the plugin.
     */
    async cleanup() {

        preferences.__cleanup__();
        compileController.__cleanup__();
        projectProperties.__cleanup__();
        this.hamburgerOptions.cleanup();
        
    }

}

/**
 * Reference to NodeJS path join.
 * @type {import('node:path').join}
 */
export let join_path;

/** 
 * Reference to NodeJS spawn.
 * @type {import('node:child_process').spawn} 
 */
export let spawn;

/** 
 * Reference to NodeJS rm.
 * @type {import('node:fs/promises').rm} 
 */
export let rm;

/**
 * Make sure we aren't running on rosetta, since GMEdit has
 * a native build and Rosetta seems to cause some weirdness!
 * 
 * @param {import('node:child_process').execSync} execSync
 */
function rosetta_check(execSync) {

    if (process.platform !== 'darwin') {
        return false;
    }

    if (process.arch !== 'x64') {
        return false;
    }

    const cmd = 'sysctl -in sysctl.proc_translated';
    const output = execSync(cmd).toString('utf-8');

    // If the return of this command is 1, we are running in Rosetta.
    return output.includes('1');

}