/**
 * Controller for the Preferences configuration on the menu.
 */

import { plugin_name, plugin_version } from '../../GMConstructor.js';
import { UIDropdownMutate } from '../../utils/gmedit/UIPreferencesUtils.js';
import * as ui from '../../ui/ui-wrappers.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { use } from '../../utils/scope-extensions/use.js';
import { Dropdown } from '../components/Dropdown.js';
import { mapToOption, None, Some } from '../../utils/Option.js';

const UIPreferences = $gmedit['ui.Preferences'];

/** @type {string} */
let pluginSettingsQueryString;

/**
 * Setup the preferences menu callback.
 */
export function __setup__() {

	pluginSettingsQueryString = `.plugin-settings[for^="${plugin_name}"]`;

	onPreferencesBuilt();
	GMEdit.on('preferencesBuilt', onPreferencesBuilt);
	
}

/**
 * Deregister callback for setting up menu.
 */
export function __cleanup__() {
	GMEdit.off('preferencesBuilt', onPreferencesBuilt);
}

/**
 * Create the preferences menu within the given group.
 * 
 * @param {HTMLElement} prefs_group Root Group element to add the preferences to.
 */
export function createPreferencesMenu(prefs_group) {

	use(document.createElement('section')).also(section => {

		section.appendChild(ui.h3('Plugin Behaviour'));

		UIPreferences.addCheckbox(
			section,
			'Automatically check for updates',
			Preferences.checkForUpdates,
			(update_check) => { Preferences.checkForUpdates = update_check; }
		).title = 'Whether to check for updates on startup via GitHub.';
	
		UIPreferences.addCheckbox(
			section,
			'Auto-save open files when running tasks',
			Preferences.saveOnRun,
			(save_on_run_task) => { Preferences.saveOnRun = save_on_run_task; }
		).title = 'Whether to automatically save when you run a project task.';
	
		UIPreferences.addCheckbox(
			section,
			'Reuse existing compiler tab',
			Preferences.saveOnRun,
			(reuse_compiler_tab) => Preferences.reuseCompilerTab = reuse_compiler_tab
		).title = 'Whether to reuse an existing compiler output tab for re-running. This may be useful to disable if you intentionally want to run multiple at a time, e.g. for multiplayer.';

	}).also(it => prefs_group.appendChild(it));

	use(document.createElement('section')).also(section => {

		section.appendChild(ui.h3('Build Settings'));

		use(new Dropdown('Runtime Type',
			Some(Preferences.runtimeBuildType),
			(runner) => Preferences.runtimeBuildType = runner,
			ZEUS_RUNTIME_TYPES
		)).let(it => it.element).also(element => {
			element.classList.add('singleline');
			element.title = 'The type of runtime to use.';
			section.appendChild(element);
		});
	
		use(new Dropdown('Runtime Release Channel',
			Some(Preferences.defaultRuntimeChannel),
			(runtime_channel_type) => Preferences.defaultRuntimeChannel = runtime_channel_type,
			GM_CHANNEL_TYPES
		)).let(it => it.element).also(element => {
			element.classList.add('singleline');
			element.title = 'The GameMaker update channel from which to pick the runtime version from.';
			section.appendChild(element);
		});
		
	}).also(it => prefs_group.appendChild(it));

	use(document.createElement('section')).also(section => {

		section.appendChild(ui.h3('Paths'));

		UIPreferences.addInput(
			section,
			'Global Builds Path',
			Preferences.globalBuildPath,
			(global_build_path) => { Preferences.globalBuildPath = global_build_path; }
		).title = 'Path to a central builds directory, which Constructor manages for you. Stops your project\'s directory being clogged by build files.';
	
		UIPreferences.addCheckbox(
			section,
			'Use the global builds directory',
			Preferences.useGlobalBuildPath,
			(use_global_build) => { Preferences.useGlobalBuildPath = use_global_build; }
		).title = 'Whether to use the global builds directory, or instead to place build files in the project\'s own directory.';

		for (const type of GM_CHANNEL_TYPES) {

			const group = ui.group(section, type);
	
			/** @type {Components.IDropdown<string>} */
			let versionDropdown;
	
			/** @type {Components.IDropdown<string>} */
			let userDropdown;
	
			UIPreferences.addInput(
				group,
				'Search Path',
				Preferences.getRuntimeSearchPath(type),
				async (path) => {
					
					// Workaround for being called twice for some reason?
					if (path === Preferences.getRuntimeSearchPath(type)) {
						return;
					}
					
					await Preferences.setRuntimeSearchPath(type, path);
					versionDropdown.setOptions(runtime_channel_get_versions(type));
	
				}
			);
	
			versionDropdown = new Dropdown('Version',
				mapToOption(Preferences.getRuntimeVersion(type)),
				(choice) => { Preferences.setRuntimeVersion(type, choice); },
				runtime_channel_get_versions(type)
			);

			group.appendChild(versionDropdown.element);
	
			UIPreferences.addInput(
				group,
				'User Data Path',
				Preferences.getUserSearchPath(type),
				async (path) => {
					// Workaround for being called twice for some reason?
					if (path === Preferences.getUserSearchPath(type)) {
						return;
					}
	
					await Preferences.setUserSearchPath(type, path);
					userDropdown.setOptions(user_strings_get_for_type(type));

				}
			);
	
			userDropdown = new Dropdown('User',
				mapToOption(Preferences.getUser(type)),
				(choice) => { Preferences.setUser(type, choice); },
				user_strings_get_for_type(type)
			);

			group.appendChild(userDropdown.element);
	
		}	
	
	}).also(it => prefs_group.appendChild(it));

}

/**
 * Get an array of version strings for the given runtime type.
 * 
 * @param {GMChannelType} channel 
 * @returns {string[]}
 */
export function runtime_channel_get_versions(channel) {
	return Preferences.getRuntimes(channel)?.map(runtime => runtime.version.toString()) ?? [];
}

/**
 * Get an array of username strings for the given runtime type.
 * @param {GMChannelType} type 
 * @returns 
 */
function user_strings_get_for_type(type) {
	return Preferences
		.getUsers(type)
		?.map(user => user.name)
		?? [];
}

/**
 * Callback for setting up our preferences menu when the user opens prefs.
 * @param {GMEdit.PluginEventMap['preferencesBuilt']} [e] 
 */
function onPreferencesBuilt(e) {

	const target = e?.target ?? document.body;
	const prefs_group = target.querySelector(pluginSettingsQueryString);

	if (prefs_group instanceof HTMLDivElement) {
		createPreferencesMenu(prefs_group);
		UIPreferences.addText(prefs_group, `Version: ${plugin_version}`);
	}

}
