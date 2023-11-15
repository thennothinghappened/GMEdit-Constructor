import { CompileController } from './CompileController.js';
import { Preferences } from './Preferences.js';
import { Menu } from './Menu.js';
import { getCurrentProject } from './utils.js';

export class GMConstructor {

    plugin_name;
    plugin_version;

    /** @type {Preferences} */
    #preferences;
    /** @type {CompileController} */
    #compiler;
    /** @type {Menu} */
    #menu;

    /**
     * @param {string} plugin_name 
     * @param {string} plugin_version 
     * @param {import('node:child_process')} child_process
     * @param {import('node:path')} path 
     */
    constructor(plugin_name, plugin_version, child_process, path) {
        this.plugin_name = plugin_name;
        this.plugin_version = plugin_version;

        this.#compiler = new CompileController(child_process, path);
        this.#preferences = new Preferences(this.plugin_name, this.plugin_version, this.#compiler.getRuntimesInDir);
        this.#menu = new Menu(this.#onCompile, this.#onClean, this.#onRun);
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
            console.error('Failed to find runtime for project!');
            return;
        }

        const res = this.#compiler.runJob(proj, runtime, {}, cmd);

        if ('err' in res) {
            console.error(res.msg);
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
