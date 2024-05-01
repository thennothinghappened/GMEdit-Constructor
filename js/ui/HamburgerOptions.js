import { Err } from '../utils/Err.js';
import { project_is_open } from '../utils/project.js';
import { ConstructorControlPanel } from './editors/ConstructorControlPanel.js';

const AceCommands = $gmedit['ace.AceCommands'];

export class HamburgerOptions {

    #menu_items;

    #menu_items_container;

    /** @type {{ [key in 'control_panel'|'compile'|'clean'|'run']: AceCommand }} */
    #commands;

    /**
     * @param {() => void} onControlPanel 
     * @param {() => void} onCompile 
     * @param {() => void} onClean 
     * @param {() => void} onRun 
     * @param {string} [controlPanelKey] Shortcut to view the control panel
     * @param {string} [compileKey] Shortcut to compile project
     * @param {string} [cleanKey] Shortcut to clean project
     * @param {string} [runKey] Shortcut to run project
     */
    constructor(onControlPanel, onCompile, onClean, onRun, controlPanelKey = 'Ctrl+`', compileKey = 'Ctrl+F5', cleanKey = 'Ctrl+F7', runKey = 'F5') {

        this.#menu_items = {
            control_panel: new Electron_MenuItem({
                id: 'constructor-control_panel',
                label: 'Control Panel',
                accelerator: controlPanelKey,
                click: onControlPanel,
                enabled: true
            }),
            compile: new Electron_MenuItem({
                id: 'constructor-compile',
                label: 'Compile',
                accelerator: compileKey,
                click: onCompile,
                enabled: false
            }),
            clean: new Electron_MenuItem({
                id: 'constructor-clean',
                label: 'Clean',
                accelerator: cleanKey,
                click: onClean,
                enabled: false
            }),
            run: new Electron_MenuItem({
                id: 'constructor-run',
                label: 'Run',
                accelerator: runKey,
                click: onRun,
                enabled: false
            })
        };

        this.#menu_items_container = new Electron_MenuItem({
            id: 'constructor-menu',
            label: 'Constructor',
            enabled: true,
            submenu: [
                this.#menu_items.control_panel,
                this.#menu_items.compile,
                this.#menu_items.clean,
                this.#menu_items.run
            ]
        });

        this.#addMenuItems();
        this.#setEnableMenuItems(project_is_open());

        this.#commands = {
            control_panel: {
                name: 'panel',
                title: 'Control Panel',
                bindKey: { win: controlPanelKey, mac: controlPanelKey },
                exec: onControlPanel
            },
            compile: {
                name: 'compile',
                title: 'Compile',
                bindKey: { win: compileKey, mac: compileKey },
                exec: onCompile
            },
            clean: {
                name: 'clean',
                title: 'Clean',
                bindKey: { win: cleanKey, mac: cleanKey },
                exec: onClean
            },
            run: {
                name: 'run',
                title: 'Run',
                bindKey: { win: runKey, mac: runKey },
                exec: onRun
            }
        };

        this.#addCommands();

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
            return ConstructorControlPanel.showError(
                'Hamburger Menu items submenu missing!',
                new Err('Menu items submenu missing!', undefined, 'Please report this on GitHub.')
            );
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
            return ConstructorControlPanel.showError(
                'Failed to deinitialize popup menu, can\'t find existing instance',
                new Err('Failed to deinitialize popup menu, can\'t find existing instance', undefined, 'Please report this on GitHub.')
            );
        }

        if (existing.submenu === undefined) {
            return ConstructorControlPanel.showError(
                'Hamburger Menu items submenu missing!',
                new Err('Menu items submenu missing!', undefined, 'Please report this on GitHub.')
            );
        }

        existing.visible = false;
        existing.submenu.clear();
    }

    #addCommands() {
        AceCommands.add(this.#commands.control_panel);
        AceCommands.add(this.#commands.compile);
        AceCommands.add(this.#commands.clean);
        AceCommands.add(this.#commands.run);
    }

    #removeCommands() {
        AceCommands.remove(this.#commands.control_panel);
        AceCommands.remove(this.#commands.compile);
        AceCommands.remove(this.#commands.clean);
        AceCommands.remove(this.#commands.run);
    }

    /**
     * Toggle whether menu items are enabled.
     * @param {boolean} enabled
     */
    #setEnableMenuItems = (enabled) => {
        // @ts-ignore
        for (const item of this.#menu_items_container.submenu.items) {
            if (item.id !== 'constructor-control_panel') {
                item.enabled = enabled;
            }
        }
    }

    #onProjectOpen = () => {
        this.#setEnableMenuItems(project_is_open());
    }

    #onProjectClose = () => {
        this.#setEnableMenuItems(project_is_open());
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
        this.#removeCommands();

        GMEdit.off('projectOpen', this.#onProjectOpen);
        GMEdit.off('projectClose', this.#onProjectClose);
    }

}
