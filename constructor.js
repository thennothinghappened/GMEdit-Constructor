// @ts-ignore
GMConstructor = class {

    static plugin_name = 'GMEdit-Constructor';
    static version = '0.1.0';

    static preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;
    static preferences = {
        
    };

    static prefs_el_query = `.plugin-settings[for="${this.plugin_name}"]`;

    static loadPreferences = () => {
        if (!Electron_FS.existsSync(this.preferences_path)) {
            return this.savePreferences();
        }

        try {
            const prefs_str = Electron_FS.readFileSync(this.preferences_path);
            Object.assign(this.preferences, JSON.parse(prefs_str));
        } catch (err) {
            this.showError(`Failed to load preferences:\n${err}\n\nUsing defaults.`);
        }
    }

    static savePreferences = () => {
        try {
            Electron_FS.writeFileSync(this.preferences_path, JSON.stringify(this.preferences));
        } catch (err) {
            this.showError(`Failed to write preferences:\n${err}`);
        }
    }

    /**
     * @param {(prefs: GMConstructor.preferences) => void} setter
     */
    static setPreference = (setter) => {
        return () => {
            setter(this.preferences);
            this.savePreferences();
        }
    }

    /**
     * @param {HTMLElement} prefs_el
     * @returns {boolean} success
     */
    static drawPreferences = (prefs_el) => {
        /** @type {HTMLElement} */
        // @ts-ignore
        const our_prefs_el = prefs_el.querySelector(this.prefs_el_query);
        
        if (our_prefs_el === null) {
            return false;
        }

        const uiPreferences = $gmedit['ui.Preferences'];

        uiPreferences.addText(our_prefs_el, `Version: ${this.version}`);

        return true;
    }

    /**
     * @param {string|Error} error
     */
    static showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }
    
    static init = () => {
        this.loadPreferences();

        if (!this.drawPreferences(document.body)) {
            GMEdit.on('preferencesBuilt', (ev) => {
                // @ts-ignore
                this.drawPreferences(ev.target);
            });
        }

    }

    static cleanup = () => {
        
    }
}

GMEdit.register(GMConstructor.plugin_name, {
    init: GMConstructor.init,
    cleanup: GMConstructor.cleanup
});

