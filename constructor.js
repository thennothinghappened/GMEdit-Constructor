import { GMConstructorCompiler } from './compiler.js';
import { GMConstructorPreferences } from './preferences.js';
import { GMConstructorMenu } from './menu.js';

/**
 * @param {string} plugin_name 
 * @param {string} version 
 * @param {import('node:process')} process 
 * @param {import('node:child_process')} child_process
 */
export function GMConstructor(plugin_name, version, process, child_process) {

    this.plugin_name = plugin_name;
    this.version = version;

    /**
     * @param {string|Error} error
     */
    const showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }

    const preferences = new GMConstructorPreferences(this.plugin_name, this.version, showError);
    const compile = new GMConstructorCompiler(showError, process, child_process);
    const menu = new GMConstructorMenu(showError);

    const onCompile = () => {

    }

    const onClean = () => {

    }

    const onRun = () => {

    }

    this.init = () => {
        preferences.init(compile.getAllRuntimes, compile.getDefaultRuntimesPath);
        menu.init(onCompile, onClean, onRun);
    }

    this.cleanup = () => {
        preferences.cleanup();
        menu.cleanup();
    }
}
