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

    /**
     * @param {string} plugin_name 
     * @param {string} version 
     * @param {import('node:process')} process 
     * @param {import('node:child_process')} child_process
     */
    constructor(plugin_name, version, process, child_process) {
        this.plugin_name = plugin_name;
        this.version = version;
        
        this.#process = process;
        this.#child_process = child_process;
    }

    /**
     * @param {string|Error} error
     */
    #showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }

    #onCompile = () => {

    }

    #onClean = () => {

    }

    #onRun = () => {

    }

    init = () => {
        this.#preferences = new GMConstructorPreferences(this.plugin_name, this.version, this.#showError);
        this.#compiler = new GMConstructorCompiler(this.#showError, this.#process, this.#child_process);
        this.#menu = new GMConstructorMenu(this.#showError, this.#onCompile, this.#onClean, this.#onRun);
    }

    cleanup = () => {
        this.#preferences.cleanup();
        this.#menu.cleanup();
    }

}
