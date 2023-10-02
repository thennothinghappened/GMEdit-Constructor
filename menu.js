export class GMConstructorMenu {

    #showError;

    #menu_items;

    #menu_items_container;

    /**
     * @param {(error: string) => void} showError
     * @param {() => void} onClickCompile 
     * @param {() => void} onClickClean 
     * @param {() => void} onClickRun 
     */
    constructor(showError, onClickCompile, onClickClean, onClickRun) {
        this.#showError = showError;

        this.#menu_items = {
            compile: new Electron_MenuItem({
                id: 'constructor-compile',
                label: 'Compile',
                accelerator: 'Ctrl+F5', // TODO: correct keybind
                click: () => onClickCompile(),
                enabled: false
            }),
            clean: new Electron_MenuItem({
                id: 'constructor-clean',
                label: 'Clean',
                accelerator: 'Ctrl+F7',
                click: () => onClickClean(),
                enabled: false
            }),
            run: new Electron_MenuItem({
                id: 'constructor-run',
                label: 'Run',
                accelerator: 'F5',
                click: () => onClickRun(),
                enabled: false
            })
        };

        this.#menu_items_container = new Electron_MenuItem({
            id: 'constructor-menu',
            label: 'Constructor',
            enabled: false,
            submenu: [
                this.#menu_items.compile,
                this.#menu_items.clean,
                this.#menu_items.run
            ]
        });

        this.#addMenuItems();

        GMEdit.on('projectOpen', this.#onProjectOpen);
        GMEdit.on('projectClose', this.#onProjectClose);
    }

    cleanup = () => {
        this.#removeMenuItems();

        GMEdit.off('projectOpen', this.#onProjectOpen);
        GMEdit.off('projectClose', this.#onProjectClose);
    }

    #findExistingMenu = () =>
        $gmedit['ui.MainMenu'].menu.items
            .find(item => item.id === this.#menu_items_container.id);

    #addMenuItems = () => {

        const menu = $gmedit['ui.MainMenu'].menu;
        const existing = this.#findExistingMenu();

        if (existing === undefined) {
            menu.append(this.#menu_items_container);
            return;
        }

        // Reusing the existing menu. This is a silly workaround
        // for https://github.com/electron/electron/issues/527

        if (this.#menu_items_container.submenu === undefined || existing.submenu === undefined) {
            return this.#showError('Menu items submenu missing!');
        }

        for (const item of this.#menu_items_container.submenu.items) {
            existing.submenu.append(item);
        }

        this.#menu_items_container = existing;
        this.#menu_items_container.visible = true;
    }

    #removeMenuItems = () => {
        const existing = this.#findExistingMenu();

        if (existing === undefined) {
            this.#showError('Failed to deinitialize popup menu, can\'t find existing instance');
            return;
        }

        if (existing.submenu === undefined) {
            return this.#showError('Menu items submenu missing!');
        }

        existing.visible = false;
        existing.submenu.clear();
    }

    /**
     * @param {boolean} enabled
     **/
    #setEnableMenuItems = (enabled) => {
        this.#menu_items_container.enabled = enabled;
        // @ts-ignore
        for (const item of this.#menu_items_container.submenu.items) {
            item.enabled = enabled;
        }
    }

    #onProjectOpen = () => {
        this.#setEnableMenuItems(true);
    }

    #onProjectClose = () => {
        this.#setEnableMenuItems(false);
    }


}
