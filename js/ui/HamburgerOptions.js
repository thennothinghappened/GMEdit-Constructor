
const KeyboardShortcutsHandler = $gmedit['ui.KeyboardShortcuts'].hashHandler;
const MainMenu = $gmedit['ui.MainMenu'];

/**
 * Default set of key binds to use. These are overwritten by the user if they choose.
 */
const DEFAULT_BINDS = {
	controlPanel: 'Ctrl+`',
	package: 'Ctrl+F5',
	stop: 'F6',
	clean: 'Ctrl+F7',
	run: 'F5'
};

/**
 * Handler for the hamburger menu options.
 */
export class HamburgerOptions {

	/**
	 * @private
	 * @type {Electron.MenuItem} 
	 */
	menu;

	/**
	 * @private
	 * @type {GMEdit.AceCommand[]} 
	 */
	shortcuts;

	/**
	 * @param {PluginCommands} commands
	 */
	constructor(commands) {

		this.shortcuts = [
			{
				name: 'constructor-panel',
				title: 'Constructor - Control Panel',
				bindKey: { win: DEFAULT_BINDS.controlPanel, mac: DEFAULT_BINDS.controlPanel },
				exec: commands.showControlPanel
			},
			{
				name: 'constructor-package',
				title: 'Constructor - Package',
				bindKey: { win: DEFAULT_BINDS.package, mac: DEFAULT_BINDS.package },
				exec: commands.packageCurrentProject
			},
			{
				name: 'constructor-clean',
				title: 'Constructor - Clean',
				bindKey: { win: DEFAULT_BINDS.clean, mac: DEFAULT_BINDS.clean },
				exec: commands.cleanCurrentProject
			},
			{
				name: 'constructor-stop',
				title: 'Constructor - Stop',
				bindKey: { win: DEFAULT_BINDS.stop, mac: DEFAULT_BINDS.stop },
				exec: commands.stopCurrentProject
			},
			{
				name: 'constructor-run',
				title: 'Constructor - Run',
				bindKey: { win: DEFAULT_BINDS.run, mac: DEFAULT_BINDS.run },
				exec: commands.runCurrentProject
			}
		];

		/** @type {Electron.MenuItemOptions[]} */
		const menuItems = [
			{
				id: 'constructor-control_panel',
				label: 'Control Panel',
				accelerator: DEFAULT_BINDS.controlPanel,
				click: commands.showControlPanel,
				enabled: true
			},
			{
				id: 'constructor-project-package',
				label: 'Package',
				accelerator: DEFAULT_BINDS.package,
				click: commands.packageCurrentProject,
				enabled: false
			},
			{
				id: 'constructor-project-clean',
				label: 'Clean',
				accelerator: DEFAULT_BINDS.clean,
				click: commands.cleanCurrentProject,
				enabled: false
			},
			{
				id: 'constructor-project-stop',
				label: 'Stop',
				accelerator: DEFAULT_BINDS.stop,
				click: commands.stopCurrentProject,
				enabled: false
			},
			{
				id: 'constructor-project-run',
				label: 'Run',
				accelerator: DEFAULT_BINDS.run,
				click: commands.runCurrentProject,
				enabled: false
			}
		];

		// Discover an existing menu from the plugin, if we've been reloaded in place. We unfortunately
		// cannot remove a menu item in-place in Electron's menu system, without clearing the entire
		// menu and rebuilding it.
		// 
		// We could call `MainMenu.init()` and force GMEdit to rebuild its menu, but this would destroy
		// any menu items made by other plugins. The compromise is leaving behind an empty menu item
		// and re-populating it upon reload. This unfortunately means disabling Constructor will leave
		// behind an empty, disabled menu that does nothing.
		const previousMenu = MainMenu.menu.items.find(item => item.id === 'constructor');
		
		if (previousMenu?.submenu !== undefined) {

			for (const item of menuItems) {
				previousMenu.submenu.append(new Electron_MenuItem(item));
			}
			
			previousMenu.enabled = true;
			this.menu = previousMenu;

		} else {

			this.menu = new Electron_MenuItem({
				id: 'constructor',
				label: 'Constructor',
				type: 'submenu',
				submenu: Electron_Menu.buildFromTemplate(menuItems)
			});
	
			MainMenu.menu.append(this.menu);
			
		}
		
		for (const shortcut of this.shortcuts) {
			KeyboardShortcutsHandler.addCommand(shortcut);
		}

	}

	/**
	 * Clean up our menu and remove event listeners.
	 */
	destroy() {

		// We can't remove existing menu items at the top level, so we just clear the content of the
		// menu instead.
		if (this.menu.submenu !== undefined) {
			this.menu.submenu.clear();
			this.menu.enabled = false;
		}

		for (const shortcut of this.shortcuts) {
			KeyboardShortcutsHandler.removeCommand(shortcut, true);
		}

	}

	/**
	 * @param {boolean} enabled
	 */
	enableProjectActionItems(enabled) {
		this.menu.submenu?.items
			.filter(item => item.id.startsWith('constructor-project'))
			.forEach(item => { item.enabled = enabled });
	}

}
