import { UIDropdownMutate } from '../utils/ui.js';

const UIPreferences = $gmedit['ui.Preferences'];

/**
 * Controller for the Preferences configuration on the menu.
 */
export class PreferencesMenu {

    /** @type {string} */
    #ele_css_query;

    #plugin_version;

    /**
     * Function to get the chosen default runtime type.
     * @type {() => string}
     */
    #getRuntimeType;

    /**
     * Function to set the chosen runtime type to use.
     * @type {(type: RuntimeType) => Promise<void>}
     */
    #setRuntimeType;

    /**
     * Function to get the search path for a given type.
     * @type {(type: RuntimeType) => string}
     */
    #getRuntimeSearchPath;

    /**
     * Function to set the search path for a given runtime type.
     * @type {(type: RuntimeType, search_path: string) => Promise<void>}
     */
    #setRuntimeSearchPath;
    
    /**
     * Function to get a list of runtime version names for a given runtime type.
     * @type {(type: RuntimeType) => string[]}
     */
    #getRuntimeVersions;

    /**
     * Function to get the chosen runtime version for a given type.
     * @type {(type: RuntimeType) => string?}
     */
    #getRuntimeChoice;

    /**
     * Function to set the chosen runtime version for a given type.
     * @type {(type: RuntimeType, choice: string) => Promise<void>}
     */
    #setRuntimeChoice;

    /**
     * Function to get whether we should save upon running a task.
     * @type {() => boolean}
     */
    #getSaveOnRunTask;

    /**
     * Function to set whether we should save upon running a task.
     * @type {(save_on_run_task: boolean) => Promise<void>}
     */
    #setSaveOnRunTask;

    /**
     * @param {string} plugin_name 
     * @param {string} plugin_version
     * 
     * @param {() => string} getRuntimeType
     * @param {(type: RuntimeType) => string[]} getRuntimeVersions
     * @param {(type: RuntimeType) => string?} getRuntimeChoice
     * @param {(type: RuntimeType) => string} getRuntimeSearchPath
     * @param {(type: RuntimeType, search_path: string) => Promise<void>} setRuntimeSearchPath
     * @param {(type: RuntimeType, choice: string) => Promise<void>} setRuntimeChoice
     * @param {(type: RuntimeType) => Promise<void>} setRuntimeType
     * 
     * @param {() => boolean} getSaveOnRunTask 
     * @param {(save_on_run_task: boolean) => Promise<void>} setSaveOnRunTask 
     */
    constructor(
        plugin_name,
        plugin_version,

        getRuntimeType,
        getRuntimeVersions,
        getRuntimeChoice,
        getRuntimeSearchPath,
        setRuntimeSearchPath,
        setRuntimeChoice,
        setRuntimeType,

        getSaveOnRunTask,
        setSaveOnRunTask
    ) {

        this.#plugin_version = plugin_version;
        this.#ele_css_query = `.plugin-settings[for="${plugin_name}"]`;

        this.#getRuntimeType = getRuntimeType;
        this.#getRuntimeVersions = getRuntimeVersions;
        this.#getRuntimeChoice = getRuntimeChoice;
        this.#getRuntimeSearchPath = getRuntimeSearchPath;
        this.#setRuntimeSearchPath = setRuntimeSearchPath;
        this.#setRuntimeChoice = setRuntimeChoice;
        this.#setRuntimeType = setRuntimeType;

        this.#getSaveOnRunTask = getSaveOnRunTask;
        this.#setSaveOnRunTask = setSaveOnRunTask;

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
            this.#getSaveOnRunTask(),
            this.#setSaveOnRunTask
        );

        /** @type {RuntimeType[]} */
        const runtime_types = ['stable', 'beta'];

        /** @type {boolean} */
        UIPreferences.addDropdown(
            prefs_group,
            'Default Runtime type',
            this.#getRuntimeType(),
            runtime_types,
            // @ts-ignore
           this.#setRuntimeType
        )

        for (const type of runtime_types) {

            const group = UIPreferences.addGroup(prefs_group, type);

            /** @type {HTMLElement} */
            let version_dropdown;

            UIPreferences.addInput(
                group,
                'Search Path',
                this.#getRuntimeSearchPath(type),
                async (path) => {
                    // Workaround for being called twice for some reason?
                    if (path === this.#getRuntimeSearchPath(type)) {
                        return;
                    }

                    await this.#setRuntimeSearchPath(type, path);
                    UIDropdownMutate(version_dropdown, this.#getRuntimeVersions(type), this.#getRuntimeChoice(type) ?? '');
                }
            );

            version_dropdown = UIPreferences.addDropdown(
                group,
                'Version',
                this.#getRuntimeChoice(type) ?? '',
                this.#getRuntimeVersions(type),
                async (choice) => {
                    await this.#setRuntimeChoice(type, choice);
                }
            );

        }

        UIPreferences.addText(prefs_group, `Version: ${this.#plugin_version}`);

        return true;
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
