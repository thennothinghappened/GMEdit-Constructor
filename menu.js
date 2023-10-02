/**
 * @class
 * @param {(error: string) => void} showError
 **/
export function GMConstructorMenu(showError) {

    /** @type {() => void} */
    let _onClickCompile;
    /** @type {() => void} */
    let _onClickClean;
    /** @type {() => void} */
    let _onClickRun;

    const menu_items = {
        compile: new Electron_MenuItem({
            id: 'constructor-compile',
            label: 'Compile',
            accelerator: 'Ctrl+F5', // TODO: correct keybind
            click: () => _onClickCompile(),
            enabled: false
        }),
        clean: new Electron_MenuItem({
            id: 'constructor-clean',
            label: 'Clean',
            accelerator: 'Ctrl+F7',
            click: () => _onClickClean(),
            enabled: false
        }),
        run: new Electron_MenuItem({
            id: 'constructor-run',
            label: 'Run',
            accelerator: 'F5',
            click: () => _onClickRun(),
            enabled: false
        })
    };

    let menu_items_container = new Electron_MenuItem({
        id: 'constructor-menu',
        label: 'Constructor',
        enabled: false,
        submenu: [
            menu_items.compile,
            menu_items.clean,
            menu_items.run
        ]
    });

    const findExistingMenu = () =>
        $gmedit['ui.MainMenu'].menu.items
            .find(item => item.id === menu_items_container.id);

    const addMenuItems = () => {

        const menu = $gmedit['ui.MainMenu'].menu;
        const existing = findExistingMenu();

        if (existing === undefined) {
            menu.append(menu_items_container);
            return;
        }

        // Reusing the existing menu. This is a silly workaround
        // for https://github.com/electron/electron/issues/527

        if (menu_items_container.submenu === undefined || existing.submenu === undefined) {
            return showError('Menu items submenu missing!');
        }

        for (const item of menu_items_container.submenu.items) {
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

        if (existing.submenu === undefined) {
            return showError('Menu items submenu missing!');
        }

        existing.visible = false;
        existing.submenu.clear();
    }

    /**
     * @param {boolean} enabled
     **/
    const setEnableMenuItems = (enabled) => {
        menu_items_container.enabled = enabled;
        // @ts-ignore
        for (const item of menu_items_container.submenu.items) {
            item.enabled = enabled;
        }
    }

    const onProjectOpen = () => {
        setEnableMenuItems(true);
    }

    const onProjectClose = () => {
        setEnableMenuItems(false);
    }

    /**
     * @param {() => void} onClickCompile
     * @param {() => void} onClickClean
     * @param {() => void} onClickRun
     */
    this.init = (onClickCompile, onClickClean, onClickRun) => {
        [ _onClickCompile, _onClickClean, _onClickRun ] = [ onClickCompile, onClickClean, onClickRun ];
        addMenuItems();

        GMEdit.on('projectOpen', onProjectOpen);
        GMEdit.on('projectClose', onProjectClose);
    }

    this.cleanup = () => {
        removeMenuItems();

        GMEdit.off('projectOpen', onProjectOpen);
        GMEdit.off('projectClose', onProjectClose);
    }

}
