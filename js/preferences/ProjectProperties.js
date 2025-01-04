/**
 * Handler for project-specific preferences.
 */

import { Err } from '../utils/Err.js';
import { project_current_get, project_config_tree_get } from '../utils/project.js';
import { Preferences } from './Preferences.js';

const GMEditProjectProperties = $gmedit['ui.project.ProjectProperties'];
const TreeView = $gmedit['ui.treeview.TreeView'];

/**
 * The current properties instance.
 * @type {Partial<TPreferences.ProjectData>}
 */
let properties = {};

/**
 * @type {Record<string, GMEdit.TreeViewDir>}
 */
let configTreeItems = {};

/**
 * @type {GMEdit.TreeViewDir}
 */
let configsTreeDir;

export class ProjectProperties {

	/**
	 * Get the active compile config name.
	 * @returns {string}
	 */
	static config_name_get() {
		return properties.config_name ?? 'Default';
	}

	/**
	 * Set the active compile config name.
	 * @param {string} config_name 
	 */
	static config_name_set(config_name) {

		this.updateConfigTree(this.config_name_get(), config_name);
		properties.config_name = config_name;

		return this.save();

	}

	/**
	 * Get the desired runner type.
	 * @returns {RunnerType}
	 */
	static runner_get() {
		return this.runner_project_get() ?? Preferences.runner;
	}

	/**
	 * Get the desired runner type for this project (without falling back to the global option).
	 * @returns {RunnerType|undefined}
	 */
	static runner_project_get() {
		return properties.runner;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	static reuse_compiler_tab_get() {
		return this.reuse_compiler_tab_project_get() ?? Preferences.reuse_compiler_tab;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean|undefined}
	 */
	static reuse_compiler_tab_project_get() {
		return properties.reuse_compiler_tab;
	}

	/**
	 * Set whether to reuse a compiler tab.
	 * @param {Boolean|undefined} reuse_compiler_tab 
	 */
	static reuse_compiler_tab_set(reuse_compiler_tab) {
		properties.reuse_compiler_tab = reuse_compiler_tab;
		return this.save();
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {RunnerType|undefined} runner 
	 */
	static runner_set(runner) {

		properties.runner = runner;
		return this.save();

	}

	/**
	 * Get the desired runtime channel type.
	 * @returns {GMChannelType}
	 */
	static runtime_channel_type_get() {
		return properties.runtime_type ?? Preferences.runtime_channel_type;
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {GMChannelType|undefined}
	 */
	static runtime_project_channel_type_get() {
		return properties.runtime_type;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMChannelType|undefined} runtime_type 
	 */
	static runtime_channel_type_set(runtime_type) {

		properties.runtime_type = runtime_type;
		return this.save();

	}

	/**
	 * Get the desired runtime version for this project.
	 * @returns {string|null}
	 */
	static runtime_version_get() {
		return properties.runtime_version ?? Preferences.runtime_version_get(this.runtime_channel_type_get());
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {string|undefined}
	 */
	static runtime_project_version_get() {
		return properties.runtime_version;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {string|undefined} runtime_type 
	 */
	static runtime_version_set(runtime_type) {

		properties.runtime_version = runtime_type;
		return this.save();

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<RuntimeInfo>}
	 */
	static runtime_get() {

		const type = this.runtime_channel_type_get();
		const desired_runtime_list = Preferences.runtime_versions_get_for_type(type);

		if (desired_runtime_list === null) {
			return {
				ok: false,
				err: new Err(`Runtime type ${type} list not loaded!`)
			};
		}

		const version = this.runtime_version_get() ?? desired_runtime_list[0]?.version?.toString();
		const runtime = desired_runtime_list.find(runtime => runtime.version.toString() === version);

		if (runtime === undefined) {
			return {
				ok: false,
				err: new Err(`Failed to find any runtimes of type ${type}`)
			};
		}

		return {
			ok: true,
			data: runtime
		};
	}

	/**
	 * Get the user to use for the current project.
	 * @returns {Result<UserInfo>}
	 */
	static user_get() {

		const type = this.runtime_channel_type_get();
		const desired_user_list = Preferences.users_get_for_type(type);

		if (desired_user_list === null) {
			return {
				ok: false,
				err: new Err(`Users for runtime ${type} list not loaded!`)
			};
		}

		const name = Preferences.user_get(type) ?? desired_user_list[0]?.name?.toString();
		const user = desired_user_list.find(user => user.name.toString() === name);

		if (user === undefined) {
			return {
				ok: false,
				err: new Err(`Failed to find any users for runtime ${type}`)
			};
		}

		return {
			ok: true,
			data: user
		};
	}

	/**
	 * Save the project properties.
	 * 
	 * @private
	 */
	static save() {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		project.properties['GMEdit-Constructor'] = properties;
		GMEditProjectProperties.save(project, project.properties);

	}

	/**
	 * Make sure the project's properties contain Constructor's
	 * data, and set up tree view build configs.
	 */
	static on_project_open = () => {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		properties = {};

		const saved = project.properties['GMEdit-Constructor'];
		
		if (saved !== undefined && saved !== null) {
			Object.assign(properties, saved);
		}
		
		const rootConfig = project_config_tree_get(project);
		configsTreeDir = TreeView.makeAssetDir('Build Configs', '', null);
		
		this.addConfigInTree(configsTreeDir.treeItems, rootConfig);
		this.updateConfigTree('', this.config_name_get());

		TreeView.element.appendChild(configsTreeDir);

	}

	/**
	 * Clean up the build configs in the tree view.
	 */
	static on_project_close = () => {
		configsTreeDir.remove();
		configTreeItems = {};
	}

	/**
	 * Add this config recursively to the parent in the tree view.
	 * 
	 * @param {HTMLDivElement} parentElement 
	 * @param {ProjectYYConfig} config 
	 */
	static addConfigInTree(parentElement, config) {

		
		const dir = TreeView.makeDir(config.name);

		dir.treeHeader.addEventListener('contextmenu', () => { this.config_name_set(config.name); });
		dir.treeHeader.addEventListener('click', TreeView.handleDirClick);
		dir.treeHeader.title = 'Right-click to select.';

		for (const childConfig of config.children) {
			this.addConfigInTree(dir.treeItems, childConfig);
		}

		configTreeItems[config.name] = dir;
		parentElement.appendChild(dir);

	}

	/**
	 * Update the config tree with the new selected config.
	 * 
	 * @param {string} oldConfigName 
	 * @param {string} newConfigName 
	 */
	static updateConfigTree(oldConfigName, newConfigName) {

		const prevTreeItem = configTreeItems[oldConfigName];

		if (prevTreeItem !== undefined) {

			const headerSpan = prevTreeItem.treeHeader.querySelector('span');

			if (headerSpan !== null) {
				headerSpan.textContent = oldConfigName;
			}

		}

		const treeItem = configTreeItems[newConfigName];

		if (treeItem !== undefined) {
			
			const headerSpan = treeItem.treeHeader.querySelector('span');

			if (headerSpan !== null) {
				headerSpan.textContent = `${newConfigName} (Selected)`;
			}

		}

	}

	static __setup__() {
		GMEdit.on('projectOpen', this.on_project_open);
		GMEdit.on('projectClose', this.on_project_close);
	}

	static __cleanup__() {
		GMEdit.off('projectOpen', this.on_project_open);
		GMEdit.off('projectClose', this.on_project_close);
	}

}
