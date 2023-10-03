import { GMConstructorCompiler } from './compiler.js';
import { GMConstructorPreferences } from './preferences.js';
import { GMConstructorMenu } from './menu.js';

export class GMConstructor {

    plugin_name;
    version;

    /** @type {GMConstructorPreferences} */
    #preferences;
    /** @type {GMConstructorCompiler} */
    #compiler;
    /** @type {GMConstructorMenu} */
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

        this.#preferences = new GMConstructorPreferences(this.plugin_name, this.version, this.#showError);
        this.#compiler = new GMConstructorCompiler(this.#showError, process, child_process, path);
        this.#menu = new GMConstructorMenu(this.#showError, this.#onCompile, this.#onClean, this.#onRun);
    }

    /**
     * @param {string|Error} error
     */
    #showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }

    /**
    * @param {GMConstructorCompilerCommand} cmd
    */
    #runTaskOnCurrentProject = (cmd) => {
        const job = this.#compiler.runJobOnCurrentProject(this.#preferences.getRuntimePath(), {}, cmd);
        this.#compiler.openEditorForJob(job);
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
