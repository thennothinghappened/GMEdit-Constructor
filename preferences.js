/**
 * @param {string} plugin_name 
 * @param {string} version 
 * @param {(error: string) => void} showError
 */
function GMConstructorPreferences(plugin_name, version, showError) {

    const preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;

    /** @type {GMConstructorPreferencesData} */
    const preferences = {

    };

    const prefs_el_query = `.plugin-settings[for="${plugin_name}"]`;

    const loadPreferences = () => {
        if (!Electron_FS.existsSync(preferences_path)) {
            return savePreferences();
        }

        try {
            const prefs_str = Electron_FS.readFileSync(preferences_path);
            Object.assign(preferences, JSON.parse(prefs_str));
        } catch (err) {
            showError(`Failed to load preferences:\n${err}\n\nUsing defaults.`);
        }
    }

    const savePreferences = () => {
        try {
            Electron_FS.writeFileSync(preferences_path, JSON.stringify(preferences));
        } catch (err) {
            showError(`Failed to write preferences:\n${err}`);
        }
    }

    /**
     * @param {(prefs: GMConstructorPreferencesData) => void} setter
     */
    const setPreference = (setter) => {
        return () => {
            setter(preferences);
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

    this.init = () => {
        loadPreferences();

        if (!drawPreferences(document.body)) {
            GMEdit.on('preferencesBuilt', onPreferencesBuilt);
        }
    }

    this.cleanup = () => {
        GMEdit.off('preferencesBuilt', onPreferencesBuilt);
    }

}
