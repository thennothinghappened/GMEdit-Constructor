/**
 * Controller for the Preferences configuration on the menu.
 */

import { plugin_name, plugin_version } from '../GMConstructor.js';
import { UIDropdownMutate } from '../utils/gmedit/UIPreferencesUtils.js';
import * as ui from '../ui/ui-wrappers.js';
import { GM_CHANNEL_TYPES, Preferences, VALID_RUNNER_TYPES } from '../preferences/Preferences.js';
import { use } from '../utils/scope-extensions/use.js';

const UIPreferences = $gmedit['ui.Preferences'];

/** @type {string} */
let ele_css_query;

/**
 * Setup the preferences menu callback.
 */
export function __setup__() {

	ele_css_query = `.plugin-settings[for^="${plugin_name}"]`;

	on_preferences_built();

	GMEdit.on('preferencesBuilt', on_preferences_built);
}

/**
 * Deregister callback for setting up menu.
 */
export function __cleanup__() {
	GMEdit.off('preferencesBuilt', on_preferences_built);
}

/**
 * Create the preferences menu within the given group.
 * 
 * @param {HTMLElement} prefs_group Root Group element to add the preferences to.
 */
export function menu_create(prefs_group) {

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

		use(UIPreferences.addDropdown(
			section,
			'Runtime Type',
			Preferences.runtimeBuildType,
			VALID_RUNNER_TYPES,
			(runner) => Preferences.runtimeBuildType = runner
		)).also(it => {
			it.classList.add('singleline');
			it.title = 'The type of runtime to use.';
		});
	
		use(UIPreferences.addDropdown(
			section,
			'Runtime Release Channel',
			Preferences.defaultRuntimeChannel,
			GM_CHANNEL_TYPES,
			(runtime_channel_type) => Preferences.defaultRuntimeChannel = runtime_channel_type
		)).also(it => {
			it.classList.add('singleline');
			it.title = 'The GameMaker update channel from which to pick the runtime version from.';
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
	
			/** @type {HTMLDivElement} */
			let version_dropdown;
	
			/** @type {HTMLDivElement} */
			let user_dropdown;
	
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
	
					UIDropdownMutate(
						version_dropdown,
						runtime_version_strings_get_for_type(type)
					);
	
				}
			);
	
			version_dropdown = UIPreferences.addDropdown(
				group,
				'Version',
				Preferences.getRuntimeVersion(type) ?? '',
				runtime_version_strings_get_for_type(type),
				(choice) => {
					Preferences.setRuntimeVersion(type, choice);
				}
			);
	
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
	
					UIDropdownMutate(
						user_dropdown,
						user_strings_get_for_type(type)
					);
				}
			);
	
			user_dropdown = UIPreferences.addDropdown(
				group,
				'User',
				Preferences.getUser(type) ?? '',
				user_strings_get_for_type(type),
				(choice) => {
					Preferences.setUser(type, choice);
				}
			);
	
		}	
	
	}).also(it => prefs_group.appendChild(it));

}

/**
 * Get an array of version strings for the given runtime type.
 * @param {GMChannelType} type 
 * @returns 
 */
export function runtime_version_strings_get_for_type(type) {
	return Preferences
		.getRuntimes(type)
		?.map(runtime => runtime.version.toString())
		?? [];
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
function on_preferences_built(e) {

	const target = e?.target ?? document.body;
	const prefs_group = target.querySelector(ele_css_query);

	if (prefs_group instanceof HTMLDivElement) {

		menu_create(prefs_group);
		UIPreferences.addText(prefs_group, `Version: ${plugin_version}`);
		
	}

}

