class GMConstructor {

    static plugin_name = 'GMEdit-Constructor';
    static version = '0.1.0';

    static preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;
    static preferences = {
        
    };

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
     * @param {string|Error} error
     */
    static showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }
    
    static init = () => {
        this.loadPreferences();
    }

    static cleanup = () => {

    }
}

GMEdit.register(GMConstructor.plugin_name, {
    init: GMConstructor.init,
    cleanup: GMConstructor.cleanup
});

