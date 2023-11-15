import { isProjectOpen } from './utils.js';

export class Menu {

    #menu_items;

    #menu_items_container;

    /**
     * @param {() => void} onClickCompile 
     * @param {() => void} onClickClean 
     * @param {() => void} onClickRun 
     */
    constructor(onClickCompile, onClickClean, onClickRun) {

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
        this.#setEnableMenuItems(isProjectOpen());

        GMEdit.on('projectOpen', this.#onProjectOpen);
        GMEdit.on('projectClose', this.#onProjectClose);
    }

    /**
     * Part of the workaround for reusing existing menu, since we can't
     * delete its item properly.
     */
    #findExistingMenu() {
        return $gmedit['ui.MainMenu'].menu.items
            .find(item => item.id === this.#menu_items_container.id);
    }

    /**
     * Add our menu items to the tool list. If we already had a submenu,
     * we reuse it due to a limitation with Electron (see below).
     */
    #addMenuItems() {

        const menu = $gmedit['ui.MainMenu'].menu;
        const existing = this.#findExistingMenu();

        if (existing === undefined) {
            menu.append(this.#menu_items_container);
            return;
        }

        // Reusing the existing menu. This is a silly workaround
        // for https://github.com/electron/electron/issues/527

        if (this.#menu_items_container.submenu === undefined || existing.submenu === undefined) {
            return console.error('Menu items submenu missing!');
        }

        for (const item of this.#menu_items_container.submenu.items) {
            existing.submenu.append(item);
        }

        this.#menu_items_container = existing;
        this.#menu_items_container.visible = true;
    }

    /**
     * Remove our existing menu for cleanup.
     */
    #removeMenuItems() {
        const existing = this.#findExistingMenu();

        if (existing === undefined) {
            console.error('Failed to deinitialize popup menu, can\'t find existing instance');
            return;
        }

        if (existing.submenu === undefined) {
            console.error('Menu items submenu missing!');
            return;
        }

        existing.visible = false;
        existing.submenu.clear();
    }

    /**
     * Toggle whether menu items are enabled.
     * @param {boolean} enabled
     */
    #setEnableMenuItems = (enabled) => {
        this.#menu_items_container.enabled = enabled;
        // @ts-ignore
        for (const item of this.#menu_items_container.submenu.items) {
            item.enabled = enabled;
        }
    }

    #onProjectOpen = () => {
        this.#setEnableMenuItems(isProjectOpen());
    }

    #onProjectClose = () => {
        this.#setEnableMenuItems(isProjectOpen());
    }

    /**
     * Clean up our menu and remove event listeners.
     * 
     * Unfortunately we can't remove the top level menu,
     * so we clear out the items and disable it. GMEdit
     * does not provide a way (that I know of) to disable
     * plugins, only reload them, so this is done with
     * the intent to get it ready to re-use.
     */
    cleanup() {
        this.#removeMenuItems();

        GMEdit.off('projectOpen', this.#onProjectOpen);
        GMEdit.off('projectClose', this.#onProjectClose);
    }

}
