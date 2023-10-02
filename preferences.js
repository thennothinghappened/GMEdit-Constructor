import { getAllRuntimes, getDefaultRuntimesPath } from './compiler.js';

export class GMConstructorPreferences {

    /** @type {string} */
    #preferences_path;
    /** @type {string} */
    #prefs_el_query;
    /** @type {GMConstructorPreferencesData} */
    #preferences = {
        runtimes: []
    }

    #showError;
    #version;

    /**
     * @param {string} plugin_name 
     * @param {string} version 
     * @param {(error: string) => void} showError
     */
    constructor(plugin_name, version, showError) {

        this.#showError = showError;
        this.#version = version;

        this.#preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;
        this.#prefs_el_query = `.plugin-settings[for="${plugin_name}"]`;

        this.#loadPreferences();

        if (this.#preferences.runtimesPath === undefined) {
            this.#preferences.runtimesPath = getDefaultRuntimesPath();
        }

        this.#preferences.runtimes = getAllRuntimes(this.#preferences.runtimesPath);

        if (!this.#drawPreferences(document.body)) {
            GMEdit.on('preferencesBuilt', this.#onPreferencesBuilt);
        }

    }

    getCurrentRuntime = () => {
        return this.#preferences.defaultRuntimeVersion ?? this.#preferences.runtimes[0];
    }

    getRuntimesPath = () => {
        return this.#preferences.runtimesPath;
    }

    /**
     * @param {string} runtime
     */
    getRuntimePath = (runtime) =>
       `${this.getRuntimesPath()}/${runtime}`

    #loadPreferences = () => {
        if (!Electron_FS.existsSync(this.#preferences_path)) {
            return this.#savePreferences();
        }

        try {
            const prefs_str = Electron_FS.readFileSync(this.#preferences_path);
            Object.assign(this.#preferences, JSON.parse(prefs_str));
        } catch (err) {
            this.#showError(`Failed to load preferences:\n${err}\n\nUsing defaults.`);
        }
    }

    #savePreferences = () => {
        try {
            Electron_FS.writeFileSync(this.#preferences_path, JSON.stringify(this.#preferences));
        } catch (err) {
            this.#showError(`Failed to write preferences:\n${err}`);
        }
    }

    /**
     * @template T
     * @param {(value: T, prefs: GMConstructorPreferencesData) => void} setter
     */
    #setPreference = (setter) => {
        /** @param {T} value */
        return (value) => {
            setter(value, this.#preferences);
            this.#savePreferences();
        }
    }

    /**
     * @param {HTMLElement} prefs_el
     * @returns {boolean} success
     */
    #drawPreferences = (prefs_el) => {
        /** @type {HTMLElement} */
        // @ts-ignore
        const our_prefs_el = prefs_el.querySelector(this.#prefs_el_query);

        if (our_prefs_el === null) {
            return false;
        }

        const uiPreferences = $gmedit['ui.Preferences'];

        const runtime_group = uiPreferences.addGroup(our_prefs_el, 'Runtime');

        uiPreferences.addInput(
            runtime_group,
            'Runtimes Path',
            this.#preferences.runtimesPath ?? '',
            this.#setPreference((val, prefs) => { prefs.runtimesPath = (val === '') ? undefined : val; })
        );

        uiPreferences.addDropdown(
            runtime_group,
            'Runtime Version',
            this.getCurrentRuntime(),
            this.#preferences.runtimes,
            this.#setPreference((val, prefs) => {
                prefs.defaultRuntimeVersion = val;
            })
        );

        uiPreferences.addText(our_prefs_el, `Version: ${this.#version}`);

        return true;
    }

    /**
     * @param {Event} ev
     */
    #onPreferencesBuilt = (ev) => {
        // @ts-ignore
        this.#drawPreferences(ev.target);
    }

    cleanup = () => {
        GMEdit.off('preferencesBuilt', this.#onPreferencesBuilt);
    }


}
