/**
 * Controller for the Preferences configuration on the menu.
 */

import { plugin_name, plugin_version } from '../GMConstructor.js';
import { UIDropdownMutate } from '../utils/ui.js';
import * as ui from '../ui/ui-wrappers.js';
import { gm_channel_types, Preferences, valid_runner_types } from '../preferences/Preferences.js';

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
 * @param {() => void} [on_refresh_runtime_settings] Callback to run on modifying runtime settings.
 */
export function menu_create(prefs_group, on_refresh_runtime_settings) {

	UIPreferences.addCheckbox(
		prefs_group,
		'Automatically check for updates on startup',
		Preferences.update_check,
		(update_check) => { Preferences.update_check = update_check; }
	);

	UIPreferences.addCheckbox(
		prefs_group,
		'Save automatically when running a task',
		Preferences.save_on_run_task,
		(save_on_run_task) => { Preferences.save_on_run_task = save_on_run_task; }
	);

	UIPreferences.addCheckbox(
		prefs_group,
		'Reuse compiler output tab between runs',
		Preferences.save_on_run_task,
		(reuse_compiler_tab) => { Preferences.reuse_compiler_tab = reuse_compiler_tab; }
	);

	UIPreferences.addDropdown(
		prefs_group,
		'Runner Type',
		Preferences.runner,
		valid_runner_types,
		(runner) => { Preferences.runner = runner; }
	);

	UIPreferences.addDropdown(
		prefs_group,
		'Runtime Channel Type',
		Preferences.runtime_channel_type,
		gm_channel_types,
		(runtime_channel_type) => {
			Preferences.runtime_channel_type = runtime_channel_type;

			if (on_refresh_runtime_settings !== undefined) {
				on_refresh_runtime_settings();
			}
		}
	);

	UIPreferences.addInput(
		prefs_group,
		'Global Builds Path',
		Preferences.global_build_path,
		(global_build_path) => { Preferences.global_build_path = global_build_path; }
	);

	UIPreferences.addCheckbox(
		prefs_group,
		'Use the global builds directory',
		Preferences.use_global_build,
		(use_global_build) => { Preferences.use_global_build = use_global_build; }
	);

	for (const type of gm_channel_types) {

		const group = ui.group(prefs_group, type);

		/** @type {HTMLDivElement} */
		let version_dropdown;

		/** @type {HTMLDivElement} */
		let user_dropdown;

		UIPreferences.addInput(
			group,
			'Search Path',
			Preferences.runtime_search_path_get(type),
			async (path) => {
				
				// Workaround for being called twice for some reason?
				if (path === Preferences.runtime_search_path_get(type)) {
					return;
				}
				
				await Preferences.runtime_search_path_set(type, path);

				UIDropdownMutate(
					version_dropdown,
					runtime_version_strings_get_for_type(type)
				);

				if (on_refresh_runtime_settings !== undefined) {
					on_refresh_runtime_settings();
				}

			}
		);

		version_dropdown = UIPreferences.addDropdown(
			group,
			'Version',
			Preferences.runtime_version_get(type) ?? '',
			runtime_version_strings_get_for_type(type),
			(choice) => {
				Preferences.runtime_version_set(type, choice);
			}
		);

		UIPreferences.addInput(
			group,
			'User Data Path',
			Preferences.users_search_path_get(type),
			async (path) => {
				// Workaround for being called twice for some reason?
				if (path === Preferences.users_search_path_get(type)) {
					return;
				}

				await Preferences.users_search_path_set(type, path);

				UIDropdownMutate(
					user_dropdown,
					user_strings_get_for_type(type)
				);
			}
		);

		user_dropdown = UIPreferences.addDropdown(
			group,
			'User',
			Preferences.user_get(type) ?? '',
			user_strings_get_for_type(type),
			(choice) => {
				Preferences.user_set(type, choice);
			}
		);

	}

}

/**
 * Get an array of version strings for the given runtime type.
 * @param {GMChannelType} type 
 * @returns 
 */
export function runtime_version_strings_get_for_type(type) {
	
	const runtimes = Preferences.runtime_versions_get_for_type(type);

	if (runtimes === null) {
		return [];
	}

	return runtimes.map(runtime => runtime.version.toString());

}

/**
 * Get an array of username strings for the given runtime type.
 * @param {GMChannelType} type 
 * @returns 
 */
function user_strings_get_for_type(type) {
	
	const users = Preferences.users_get_for_type(type);

	if (users === null) {
		return [];
	}

	return users.map(user => user.name.toString());

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

