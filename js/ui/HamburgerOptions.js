/**
 * Handler for the hamburger menu options.
 */

import { GMConstructor } from '../GMConstructor.js';
import { project_is_open } from '../utils/project.js';

const KeyboardShortcutsHandler = $gmedit['ui.KeyboardShortcuts'].hashHandler;
const Menu = $gmedit['ui.MainMenu'].menu;

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
			exec: on_control_panel
		},
		{
			name: 'constructor-package',
			title: 'Constructor - Package',
			bindKey: { win: default_binds.package, mac: default_binds.package },
			exec: on_package
		},
		{
			name: 'constructor-clean',
			title: 'Constructor - Clean',
			bindKey: { win: default_binds.clean, mac: default_binds.clean },
			exec: on_clean
		},
		{
			name: 'constructor-stop',
			title: 'Constructor - Stop',
			bindKey: { win: default_binds.stop, mac: default_binds.stop },
			exec: on_stop
		},
		{
			name: 'constructor-run',
			title: 'Constructor - Run',
			bindKey: { win: default_binds.run, mac: default_binds.run },
			exec: on_run
		}
	];
	
	menu_register();
	commands_register();

	menu_items_enable(project_is_open());

	GMEdit.on('projectOpen', on_project_open);
	GMEdit.on('projectClose', on_project_close);

}

/**
 * Clean up our menu and remove event listeners.
 */
export function __cleanup__() {

	// We can't remove existing menu items at the top level, so leave them be.
	commands_deregister();

	GMEdit.off('projectOpen', on_project_open);
	GMEdit.off('projectClose', on_project_close);

}

function on_control_panel() {
	if (window.GMConstructor instanceof GMConstructor) {
		window.GMConstructor.onControlPanel();
	}
}

function on_package() {
	if (window.GMConstructor instanceof GMConstructor) {
		window.GMConstructor.packageCurrent();
	}
}

function on_stop() {
	if (window.GMConstructor instanceof GMConstructor) {
		window.GMConstructor.stopCurrent();
	}
}

function on_clean() {
	if (window.GMConstructor instanceof GMConstructor) {
		window.GMConstructor.cleanCurrent();
	}
}

function on_run() {
	if (window.GMConstructor instanceof GMConstructor) {
		window.GMConstructor.runCurrent();
	}
}

function on_project_open() {
	menu_items_enable(project_is_open());
}

function on_project_close() {
	menu_items_enable(project_is_open());
}

/**
 * Add our menu items to the tool list, if they don't already exist.
 */
function menu_register() {

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
				click: on_control_panel,
				enabled: true
			}),
			new Electron_MenuItem({
				id: 'constructor-project-package',
				label: 'Package',
				accelerator: default_binds.package,
				click: on_package,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-clean',
				label: 'Clean',
				accelerator: default_binds.clean,
				click: on_clean,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-stop',
				label: 'Stop',
				accelerator: default_binds.stop,
				click: on_stop,
				enabled: false
			}),
			new Electron_MenuItem({
				id: 'constructor-project-run',
				label: 'Run',
				accelerator: default_binds.run,
				click: on_run,
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

/**
 * Toggle whether menu items are enabled.
 * @param {boolean} enabled
 */
function menu_items_enable(enabled) {
	
	const items = constructor_menu.submenu
		?.items
		?.filter(item => item.id.startsWith('constructor-project')) ?? [];

	for (const item of items) {
		item.enabled = enabled;
	}

}
