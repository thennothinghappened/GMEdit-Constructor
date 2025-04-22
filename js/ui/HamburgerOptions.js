/**
 * Handler for the hamburger menu options.
 */

const KeyboardShortcutsHandler = $gmedit['ui.KeyboardShortcuts'].hashHandler;

/**
 * Default set of key binds to use. These are overwritten by the user if they choose.
 */
const default_binds = {
	control_panel: 'Ctrl+`',
	package: 'Ctrl+F5',
	stop: 'F6',
	clean: 'Ctrl+F7',
	run: 'F5'
};

/** @type {Electron.MenuItem} */
let constructor_menu;

/** @type {GMEdit.AceCommand[]} */
let commands;

export function __setup__() {

	commands = [
		{
			name: 'constructor-panel',
			title: 'Constructor - Control Panel',
			bindKey: { win: default_binds.control_panel, mac: default_binds.control_panel },
			exec: showControlPanel
		},
		{
			name: 'constructor-package',
			title: 'Constructor - Package',
			bindKey: { win: default_binds.package, mac: default_binds.package },
			exec: packageCurrentProject
		},
		{
			name: 'constructor-clean',
			title: 'Constructor - Clean',
			bindKey: { win: default_binds.clean, mac: default_binds.clean },
			exec: cleanCurrentProject
		},
		{
			name: 'constructor-stop',
			title: 'Constructor - Stop',
			bindKey: { win: default_binds.stop, mac: default_binds.stop },
			exec: stopCurrentProject
		},
		{
			name: 'constructor-run',
			title: 'Constructor - Run',
			bindKey: { win: default_binds.run, mac: default_binds.run },
			exec: runCurrentProject
		}
	];
	
	menu_register();
	commands_register();

	updateItemEnabledState();

	GMEdit.on('projectOpen', onProjectOpen);
	GMEdit.on('projectClose', onProjectClose);

}

/**
 * Clean up our menu and remove event listeners.
 */
export function __cleanup__() {

	// We can't remove existing menu items at the top level, so leave them be.
	commands_deregister();

	GMEdit.off('projectOpen', onProjectOpen);
	GMEdit.off('projectClose', onProjectClose);

}

function showControlPanel() {
	window.ConstructorPlugin?.showControlPanel();
}

function packageCurrentProject() {
	window.ConstructorPlugin?.packageCurrent();
}

function stopCurrentProject() {
	window.ConstructorPlugin?.stopCurrent();
}

function cleanCurrentProject() {
	window.ConstructorPlugin?.cleanCurrent();
}

function runCurrentProject() {
	window.ConstructorPlugin?.runCurrent();
}

function onProjectOpen() {
	updateItemEnabledState();
}

function onProjectClose() {
	updateItemEnabledState();
}

/**
 * Add our menu items to the tool list, if they don't already exist.
 */
function menu_register() {

	const Menu = $gmedit['ui.MainMenu'].menu;
	const existing_menu = Menu.items.find(item => item.id === 'constructor');

	if (existing_menu !== undefined) {
		constructor_menu = existing_menu;
		return;
	}

	constructor_menu = new Electron_MenuItem({
		id: 'constructor',
		label: 'Constructor',
		submenu: [
			new Electron_MenuItem({
				id: 'constructor-control_panel',
				label: 'Control Panel',
				accelerator: default_binds.control_panel,
				click: showControlPanel,
				enabled: true
			}),
			new Electron_MenuItem({
				id: 'constructor-project-package',
				label: 'Package',
				accelerator: default_binds.package,
				click: packageCurrentProject,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-clean',
				label: 'Clean',
				accelerator: default_binds.clean,
				click: cleanCurrentProject,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-stop',
				label: 'Stop',
				accelerator: default_binds.stop,
				click: stopCurrentProject,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-run',
				label: 'Run',
				accelerator: default_binds.run,
				click: runCurrentProject,
				enabled: false
			})
		]
	});

	Menu.append(constructor_menu);

}

function commands_register() {
	for (const command of commands) {
		KeyboardShortcutsHandler.addCommand(command);
	}
}

function commands_deregister() {
	for (const command of commands) {
		KeyboardShortcutsHandler.removeCommand(command, true);
	}
}

function updateItemEnabledState() {

	const pluginInstance = window.ConstructorPlugin;

	if (pluginInstance === undefined) {
		return;
	}

	const enabled = (pluginInstance.currentProjectComponents !== undefined);

	const items = constructor_menu.submenu
		?.items
		?.filter(item => item.id.startsWith('constructor-project')) ?? [];

	for (const item of items) {
		item.enabled = enabled;
	}

}
