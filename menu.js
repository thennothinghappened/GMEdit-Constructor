/**
 * @param {(error: string) => void} showError
 * @param {(runtime: string, launch: boolean) => Promise<void>} compile 
 * @param {() => string} getCurrentRuntime
 * @param {() => string} getRuntimesPath
 **/
function GMConstructorMenu(showError, compile, getCurrentRuntime, getRuntimesPath) {

    const menu_items = {
        separator: new Electron_MenuItem({
            id: 'constructor-separator',
            type: 'separator',
            enabled: false
        }),
        compile: new Electron_MenuItem({
            id: 'constructor-compile',
            label: 'Compile',
            click: async () => {
                await compile(getRuntimesPath() + '/' + getCurrentRuntime(), false);
            },
            enabled: false
        }),
        run: new Electron_MenuItem({
            id: 'constructor-run',
            label: 'Run',
            click: async () => {
                await compile(getRuntimesPath() + '/' + getCurrentRuntime(), true);
            },
            enabled: false
        })
    };

    let menu_items_container = new Electron_MenuItem({
        id: 'constructor-menu',
        label: 'Constructor',
        enabled: false,
        // @ts-ignore
        submenu: [
            menu_items.separator,
            menu_items.compile,
            menu_items.run
        ]
    });

    const findExistingMenu = () => {
        const menu = $gmedit['ui.MainMenu'].menu;

        return menu.items.find(item => item.id === menu_items_container.id);
    }

    const addMenuItems = () => {

        const menu = $gmedit['ui.MainMenu'].menu;
        const existing = findExistingMenu();

        if (existing === undefined) {
            menu.append(menu_items_container);
            return;
        }

        // Reusing the existing menu. This is a silly workaround
        // for https://github.com/electron/electron/issues/527

        // @ts-ignore
        for (const item of menu_items_container.submenu.items) {
            // @ts-ignore
            existing.submenu.append(item);
        }

        menu_items_container = existing;
        menu_items_container.visible = true;
    }

    const removeMenuItems = () => {
        const existing = findExistingMenu();

        if (existing === undefined) {
            showError('Failed to deinitialize popup menu, can\'t find existing instance');
            return;
        }

        existing.visible = false;
        // @ts-ignore
        existing.submenu.clear();
    }

    /**
     * @param {boolean} enabled
     */
    this.setEnableMenuItems = (enabled) => {
        menu_items_container.enabled = enabled;
        // @ts-ignore
        for (const item of menu_items_container.submenu.items) {
            item.enabled = enabled;
        }
    }

    this.init = () => {
        addMenuItems();
    }

    this.cleanup = () => {
        removeMenuItems();
    }

}
