/**
 * @class
 * @param {string} plugin_name 
 * @param {string} version 
 * @param {(error: string) => void} showError
 */
export function GMConstructorPreferences(plugin_name, version, showError) {

    const preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;

    /** @type {GMConstructorPreferencesData} */
    this.preferences = {
        runtimes: []
    };

    const prefs_el_query = `.plugin-settings[for="${plugin_name}"]`;

    this.getCurrentRuntime = () => {
        return this.preferences.defaultRuntimeVersion ?? this.preferences.runtimes[0];
    }

    this.getRuntimesPath = () => {
        return this.preferences.runtimesPath;
    }

    const loadPreferences = () => {
        if (!Electron_FS.existsSync(preferences_path)) {
            return savePreferences();
        }

        try {
            const prefs_str = Electron_FS.readFileSync(preferences_path);
            Object.assign(this.preferences, JSON.parse(prefs_str));
        } catch (err) {
            showError(`Failed to load preferences:\n${err}\n\nUsing defaults.`);
        }
    }

    const savePreferences = () => {
        try {
            Electron_FS.writeFileSync(preferences_path, JSON.stringify(this.preferences));
        } catch (err) {
            showError(`Failed to write preferences:\n${err}`);
        }
    }

    /**
     * @template T
     * @param {(value: T, prefs: GMConstructorPreferencesData) => void} setter
     */
    const setPreference = (setter) => {
        /** @param {T} value */
        return (value) => {
            setter(value, this.preferences);
            savePreferences();
        }
    }

    /**
     * @param {HTMLElement} prefs_el
     * @returns {boolean} success
     */
    const drawPreferences = (prefs_el) => {
        /** @type {HTMLElement} */
        // @ts-ignore
        const our_prefs_el = prefs_el.querySelector(prefs_el_query);

        if (our_prefs_el === null) {
            return false;
        }

        const uiPreferences = $gmedit['ui.Preferences'];

        const runtime_group = uiPreferences.addGroup(our_prefs_el, 'Runtime');

        uiPreferences.addInput(
            runtime_group,
            'Runtimes Path',
            this.preferences.runtimesPath ?? '',
            setPreference((val, prefs) => { prefs.runtimesPath = (val === '') ? undefined : val; })
        );

        uiPreferences.addDropdown(
            runtime_group,
            'Runtime Version',
            this.getCurrentRuntime(),
            this.preferences.runtimes,
            setPreference((val, prefs) => {
                prefs.defaultRuntimeVersion = val;
            })
        );

        uiPreferences.addText(our_prefs_el, `Version: ${version}`);

        return true;
    }

    /**
     * @param {Event} ev
     */
    const onPreferencesBuilt = (ev) => {
        // @ts-ignore
        drawPreferences(ev.target);
    }

    /**
     * @param {(path?: string) => string[]} getAllRuntimes 
     * @param {() => string} getDefaultRuntimesPath 
     */
    this.init = (getAllRuntimes, getDefaultRuntimesPath) => {
        loadPreferences();

        if (this.preferences.runtimesPath === undefined) {
            this.preferences.runtimesPath = getDefaultRuntimesPath();
        }

        this.preferences.runtimes = getAllRuntimes(this.preferences.runtimesPath);

        if (!drawPreferences(document.body)) {
            GMEdit.on('preferencesBuilt', onPreferencesBuilt);
        }
    }

    this.cleanup = () => {
        GMEdit.off('preferencesBuilt', onPreferencesBuilt);
    }

}
