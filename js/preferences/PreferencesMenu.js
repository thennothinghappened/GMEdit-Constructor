import { plugin_name, plugin_version } from '../GMConstructor.js';
import { UIDropdownMutate } from '../utils/ui.js';
import * as preferences from './Preferences.js';

const UIPreferences = $gmedit['ui.Preferences'];

/**
 * Controller for the Preferences configuration on the menu.
 */
export class PreferencesMenu {

    /** @type {string} */
    #ele_css_query;

    constructor() {

        this.#ele_css_query = `.plugin-settings[for="${plugin_name}"]`;
        this.preferences = preferences;

        if (!this.#createMenu(document.body)) {
            GMEdit.on('preferencesBuilt', this.#onPreferencesBuilt);
        }

    }

    /**
     * @param {HTMLElement} prefs_el
     * @returns {boolean} Whether creating the menu was successful.
     */
    #createMenu = (prefs_el) => {
        
        /** @type {HTMLElement?} */
        const prefs_group = prefs_el.querySelector(this.#ele_css_query);

        if (prefs_group === null) {
            return false;
        }

        UIPreferences.addCheckbox(
            prefs_group,
            'Save automatically when running a task',
            preferences.save_on_run_task_get(),
            preferences.save_on_run_task_set
        );

        UIPreferences.addCheckbox(
            prefs_group,
            'Reuse compiler output tab between runs',
            preferences.save_on_run_task_get(),
            preferences.reuse_compiler_tab_set
        );

        /** @type {boolean} */
        UIPreferences.addDropdown(
            prefs_group,
            'Default Runtime type',
            preferences.global_runtime_type_get(),
            preferences.valid_runtime_types,
            // @ts-ignore
            preferences.global_runtime_type_set
        )

        for (const type of preferences.valid_runtime_types) {

            const group = UIPreferences.addGroup(prefs_group, type);

            /** @type {HTMLElement} */
            let version_dropdown;

            UIPreferences.addInput(
                group,
                'Search Path',
                preferences.runtime_search_path_get(type),
                async (path) => {
                    // Workaround for being called twice for some reason?
                    if (path === preferences.runtime_search_path_get(type)) {
                        return;
                    }

                    await preferences.runtime_search_path_set(type, path);
                    UIDropdownMutate(
                        version_dropdown,
                        this.#runtimeVersionStringsGetForType(type),
                        preferences.global_runtime_choice_get(type) ?? ''
                    );
                }
            );

            version_dropdown = UIPreferences.addDropdown(
                group,
                'Version',
                preferences.global_runtime_choice_get(type) ?? '',
                this.#runtimeVersionStringsGetForType(type),
                (choice) => {
                    preferences.global_runtime_choice_set(type, choice);
                }
            );

        }

        UIPreferences.addText(prefs_group, `Version: ${plugin_version}`);

        return true;
    }

    /**
     * Get an array of version strings for the given runtime type.
     * @param {RuntimeType} type 
     * @returns 
     */
    #runtimeVersionStringsGetForType(type) {
        
        const runtimes = preferences.runtime_versions_get_for_type(type);

        if (runtimes === null) {
            return [];
        }

        return runtimes.map(runtime => runtime.version.toString());

    }

    /**
     * Callback for setting up our preferences menu when the user opens prefs.
     * @param {Event} ev
     */
    #onPreferencesBuilt = (ev) => {
        // @ts-ignore
        this.#createMenu(ev.target);
    }

    /**
     * Deregister callback for setting up menu.
     */
    cleanup = () => {
        GMEdit.off('preferencesBuilt', this.#onPreferencesBuilt);
    }

}
