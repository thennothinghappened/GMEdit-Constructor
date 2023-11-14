import { CompileController } from './compiler.js';
import { Preferences } from './preferences.js';
import { Menu } from './menu.js';
import { getCurrentProject } from './utils.js';

export class GMConstructor {

    plugin_name;
    version;

    /** @type {Preferences} */
    #preferences;
    /** @type {CompileController} */
    #compiler;
    /** @type {Menu} */
    #menu;

    /**
     * @param {string} plugin_name 
     * @param {string} version 
     * @param {import('node:process')} process 
     * @param {import('node:child_process')} child_process
     * @param {import('node:path')} path 
     */
    constructor(plugin_name, version, process, child_process, path) {
        this.plugin_name = plugin_name;
        this.version = version;

        this.#compiler = new CompileController(this.#showError, process, child_process, path);
        this.#preferences = new Preferences(this.plugin_name, this.version, this.#compiler.getRuntimesInDir, this.#showError);
        this.#menu = new Menu(this.#showError, this.#onCompile, this.#onClean, this.#onRun);
    }

    /**
     * @param {string|Error} error
     */
    #showError = (error) => {
        console.error(`${this.plugin_name}: ${error}`);
    }

    /**
    * @param {JobCommand} cmd
    */
    #runTaskOnCurrentProject = (cmd) => {
        const proj = getCurrentProject();

        if (proj === undefined) {
            return;
        }

        const runtime = this.#preferences.getProjectRuntime(proj);

        if (runtime === undefined) {
            this.#showError('Failed to find runtime for project!');
            return;
        }

        const res = this.#compiler.runJob(proj, runtime, {}, cmd);

        if ('err' in res) {
            this.#showError(res.msg);
            return;
        }

        this.#compiler.openEditorForJob(res.data);
    }

    #onCompile = () => {
        this.#runTaskOnCurrentProject('Package');
    }

    #onClean = () => {
        this.#runTaskOnCurrentProject('Clean');
    }

    #onRun = () => {
        this.#runTaskOnCurrentProject('Run');
    }

    cleanup = () => {
        this.#preferences.cleanup();
        this.#menu.cleanup();
    }

}
