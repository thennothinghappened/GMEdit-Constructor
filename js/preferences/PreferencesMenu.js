import { UIDropdownMutate } from '../utils.js';

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
     * @param {string} plugin_name 
     * @param {string} plugin_version
     * @param {() => string} getRuntimeType Function to get the chosen default runtime type.
     * @param {(type: RuntimeType) => string[]} getRuntimeVersions Function to get a list of runtime version names for a given runtime type.
     * @param {(type: RuntimeType) => string?} getRuntimeChoice Function to get the chosen runtime version for a given type.
     * @param {(type: RuntimeType) => string} getRuntimeSearchPath Function to get the search path for a given type.
     * @param {(type: RuntimeType, search_path: string) => Promise<void>} setRuntimeSearchPath Function to set the search path for a given runtime type.
     * @param {(type: RuntimeType, choice: string) => Promise<void>} setRuntimeChoice Function to set the chosen runtime version for a given type.
     * @param {(type: RuntimeType) => Promise<void>} setRuntimeType Function to set the chosen runtime type to use.
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
        setRuntimeType
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
        const our_prefs_el = prefs_el.querySelector(this.#ele_css_query);

        if (our_prefs_el === null) {
            return false;
        }

        /** @type {RuntimeType[]} */
        const runtime_types = ['stable', 'beta'];

        /** @type {boolean} */
        UIPreferences.addDropdown(
            our_prefs_el,
            'Default Runtime type',
            this.#getRuntimeType(),
            runtime_types,
            // @ts-ignore
            async (/** @type {RuntimeType} */ choice) => {
                await this.#setRuntimeType(choice);
            }
        )

        for (const type of runtime_types) {

            const group = UIPreferences.addGroup(our_prefs_el, type);

            /** @type {HTMLElement} */
            let version_dropdown;

            UIPreferences.addInput(
                group,
                'Search Path',
                this.#getRuntimeSearchPath(type),
                async (path) => {
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

        UIPreferences.addText(our_prefs_el, `Version: ${this.#plugin_version}`);

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
