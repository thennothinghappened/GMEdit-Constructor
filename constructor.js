(function () {

    class GMConstructor {

        static plugin_name = 'GMEdit-Constructor';
        static version = '0.1.0';

        static preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;
        static preferences = {

        };

        static prefs_el_query = `.plugin-settings[for="${this.plugin_name}"]`;

        static menu_items = {
            separator: new Electron_MenuItem({
                id: 'constructor-separator',
                type: 'separator',
                enabled: false
            }),
            compile: new Electron_MenuItem({
                id: 'constructor-compile',
                label: 'Compile',
                enabled: false
            }),
            run: new Electron_MenuItem({
                id: 'constructor-run',
                label: 'Run',
                enabled: false
            })
        };

        static menu_items_container = new Electron_MenuItem({
            id: 'constructor-menu',
            label: 'Constructor',
            enabled: false,
            // @ts-ignore
            submenu: [
                this.menu_items.separator,
                this.menu_items.compile,
                this.menu_items.run
            ]
        });

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

        static findExistingMenu = () => {
            const menu = $gmedit['ui.MainMenu'].menu;

            return menu.items.find(item => item.id === this.menu_items_container.id);
        }

        static addMenuItems = () => {

            const menu = $gmedit['ui.MainMenu'].menu;
            const existing = this.findExistingMenu();

            if (existing === undefined) {
                menu.append(this.menu_items_container);
                return;
            }

            // Reusing the existing menu. This is a silly workaround
            // for https://github.com/electron/electron/issues/527

            // @ts-ignore
            for (const item of this.menu_items_container.submenu.items) {
                // @ts-ignore
                existing.submenu.append(item);
            }

            this.menu_items_container = existing;
            this.menu_items_container.visible = true;
        }

        static removeMenuItems = () => {
            const existing = this.findExistingMenu();
            
            if (existing === undefined) {
                this.showError('Failed to deinitialize popup menu, can\'t find existing instance');
                return;
            }

            existing.visible = false;
            // @ts-ignore
            existing.submenu.clear();
        }

        /**
         * @param {boolean} enabled
         */
        static setEnableMenuItems = (enabled) => {
            // @ts-ignore
            for (const item of this.menu_items_container.submenu.items) {
                item.enabled = enabled;
            }
        }

        static onProjectOpen = () => {
            this.setEnableMenuItems(true);
        }

        static onProjectClose = () => {
            this.setEnableMenuItems(false);
        }

        /**
         * @param {Event} ev
         */
        static onPreferencesBuilt = (ev) => {
            // @ts-ignore
            this.drawPreferences(ev.target);
        }

        /**
         * @param {string|Error} error
         */
        static showError = (error) => {
            console.log(`${this.plugin_name}: ${error}`);
        }

        static init = () => {
            this.loadPreferences();
            this.addMenuItems();

            if (!this.drawPreferences(document.body)) {
                GMEdit.on('preferencesBuilt', this.onPreferencesBuilt);
            }

            GMEdit.on('projectOpen', this.onProjectOpen);
            GMEdit.on('projectClose', this.onProjectClose);
        }

        static cleanup = () => {
            this.removeMenuItems();

            GMEdit.off('projectOpen', this.onProjectOpen);
            GMEdit.off('projectClose', this.onProjectClose);
            GMEdit.off('preferencesBuilt', this.onPreferencesBuilt);
        }
    }

    GMEdit.register(GMConstructor.plugin_name, {
        init: () => {},
        cleanup: GMConstructor.cleanup
    });

    // workaround at the moment since reloading doesn't call init again:
    // https://github.com/YellowAfterlife/GMEdit/issues/201
    GMConstructor.init();

})();
