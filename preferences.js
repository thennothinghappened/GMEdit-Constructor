import { uiDropdownMutate } from './utils.js';

/** @type {{[key in NodeJS.Platform]: { stable: string, beta: string }}} */
const defaultRuntimePaths = {
    'win32': {
        stable: 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        beta: 'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes'
    },
    'darwin': {
        stable: '/Users/Shared/GameMakerStudio2/Cache/runtimes',
        beta: '/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes'
    }
};

export class Preferences {

    /** @type {string} */
    #preferences_path;
    /** @type {string} */
    #prefs_el_query;
    /** @type {PreferencesData} */
    #preferences = {
        globalDefaultRuntimeType: 'stable',
        runtimeTypes: {
            stable: {
                searchPath: defaultRuntimePaths[process.platform].stable
            },
            beta: {
                searchPath: defaultRuntimePaths[process.platform].beta
            }
        }
    };

    /**
     * List of known runtimes, this gets populated by runtimes found in the `searchPath`.
     * @type { { [key in RuntimeType]: { [key: string]: RuntimeInfo } } }
     */
    #runtimes = {
        stable: {},
        beta: {}
    };

    #showError;
    #version;

    #getRuntimesInDir;

    /**
     * @param {string} plugin_name 
     * @param {string} version 
     * @param {(path: string) => Promise<Result<{ [key: string]: RuntimeInfo }, 'directory not found'|'directory read failed'>>} getRuntimesInDir 
     * @param {(error: string) => void} showError
     */
    constructor(plugin_name, version, getRuntimesInDir, showError) {

        this.#showError = showError;
        this.#version = version;

        this.#getRuntimesInDir = getRuntimesInDir;

        this.#preferences_path = `${Electron_App.getPath('userData')}/GMEdit/config/constructor-preferences.json`;
        this.#prefs_el_query = `.plugin-settings[for="${plugin_name}"]`;
        
        this.#loadPreferences();

        for (const type in this.#runtimes) {
            this.#runtimesFind(type);
        }

        if (!this.#drawPreferences(document.body)) {
            GMEdit.on('preferencesBuilt', this.#onPreferencesBuilt);
        }

    }

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
     * @param {(value: T, prefs: PreferencesData) => void} setter
     */
    #setPreference = (setter) => {
        /** @param {T} value */
        return (value) => {
            setter(value, this.#preferences);
            this.#savePreferences();
        }
    }

    /**
     * Find the list of runtimes for a given type.
     * @param {RuntimeType} type 
     */
    #runtimesFind = async (type) => {

        let path = this.#preferences.runtimeTypes[type].searchPath;

        if (path === undefined) {
            path = defaultRuntimePaths[process.platform][type];

            this.#preferences.runtimeTypes[type].searchPath = path;
            this.#savePreferences();
        }

        const res = await this.#getRuntimesInDir(path);

        if ('err' in res) {
            this.#runtimes[type] = {};
            this.#showError(res.msg);
            return;
        }

        this.#runtimes[type] = res.data;
        
        const def = this.#preferences.runtimeTypes[type].globalDefault;

        if (def === undefined || !(def in this.#runtimes[type])) {
            this.#preferences.runtimeTypes[type].globalDefault = Object.keys(this.#runtimes[type])[0];
        }

        this.#savePreferences();
        
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

        uiPreferences.addDropdown(
            our_prefs_el,
            'Default Runtime type',
            this.#preferences.globalDefaultRuntimeType,
            Object.keys(this.#runtimes),
            this.#setPreference((val, prefs) => {
                prefs.globalDefaultRuntimeType = val;
            })
        )

        for (const [type, runtime] of Object.entries(this.#preferences.runtimeTypes)) {

            // @ts-ignore
            const defaultSearchPath = defaultRuntimePaths[process.platform][type];

            const type_group = uiPreferences.addGroup(our_prefs_el, type);

            /** @type {HTMLElement} */
            let version;

            // Chosen path to search for runtimes in.
            const search_path = uiPreferences.addInput(
                type_group,
                'Search Path',
                runtime.searchPath,
                this.#setPreference(async (val) => {

                    runtime.searchPath = (val.length === 0)
                        ? defaultSearchPath
                        : val;
                    
                    // @ts-ignore
                    await this.#runtimesFind(type);

                    if (!(runtime.globalDefault in this.#runtimes[type])) {
                        runtime.globalDefault = this.#runtimes[type][0];
                    }

                    // @ts-ignore
                    // Update the dropdown to the new list of runtimes.
                    uiDropdownMutate(version, Object.keys(this.#runtimes[type]), runtime.globalDefault);
                })
            );
    
            // Chosen specific runtime to use.
            version = uiPreferences.addDropdown(
                type_group,
                'Version',
                runtime.globalDefault ?? '',
                // @ts-ignore
                Object.keys(this.#runtimes[type]),
                this.#setPreference((val) => {
                    if (val !== '') {
                        runtime.globalDefault = val;
                    }
                })
            );

        }

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

    get #globalDefaultRuntimeType() {
        return this.#preferences.globalDefaultRuntimeType;
    }

    get #globalDefaultRuntimeName() {
        return this.#preferences.runtimeTypes[this.#globalDefaultRuntimeType].globalDefault;
    }

    /**
     * @type {RuntimeInfo|undefined}
     */
    get #globalDefaultRuntime() {
        if (this.#globalDefaultRuntimeName === undefined) {
            return undefined;
        }
        
        return this.#runtimes[this.#preferences.globalDefaultRuntimeType][this.#globalDefaultRuntimeName];
    }

    /**
     * Get the runtime to use for a specific project!
     * @param {GMLProject} project 
     */
    getProjectRuntime = (project) => {
        // TODO: projects with own specified runtime.
        return this.#globalDefaultRuntime;
    }

    cleanup = () => {
        GMEdit.off('preferencesBuilt', this.#onPreferencesBuilt);
    }


}
