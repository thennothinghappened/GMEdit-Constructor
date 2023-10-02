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

    #process;
    #child_process;
    #path;

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
        
        this.#process = process;
        this.#child_process = child_process;
        this.#path = path;
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
        this.#compiler.runJobOnCurrentProject(this.#preferences.getRuntimePath(), {}, cmd);
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

    init = () => {
        this.#preferences = new GMConstructorPreferences(this.plugin_name, this.version, this.#showError);
        this.#compiler = new GMConstructorCompiler(this.#showError, this.#process, this.#child_process, this.#path);
        this.#menu = new GMConstructorMenu(this.#showError, this.#onCompile, this.#onClean, this.#onRun);
    }

    cleanup = () => {
        this.#preferences.cleanup();
        this.#menu.cleanup();
    }

}
