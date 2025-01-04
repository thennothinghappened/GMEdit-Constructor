/**
 * Handler for project-specific preferences.
 */

import { Err } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_current_get, project_config_tree_get } from '../utils/project.js';
import { Preferences } from './Preferences.js';

const GMEditProjectProperties = $gmedit['ui.project.ProjectProperties'];

/**
 * The current properties instance.
 * @type {Partial<TPreferences.ProjectData>}
 */
let properties = {};

export class ProjectProperties {

	/**
	 * @readonly
	 * @private
	 * @type {EventEmitterImpl<TPreferences.ProjectPropertiesEventMap>}
	 */
	static eventEmitter = new EventEmitterImpl(['changeBuildConfig']);

	/**
	 * @returns {EventEmitter<TPreferences.ProjectPropertiesEventMap>}
	 */
	static get events() {
		return this.eventEmitter;
	}

	/**
	 * Get the active compile config name.
	 * @returns {string}
	 */
	static get buildConfig() {
		return properties.config_name ?? 'Default';
	}

	/**
	 * Set the active compile config name.
	 * @param {string} config_name 
	 */
	static set buildConfig(config_name) {

		const previous = properties.config_name;

		properties.config_name = config_name;
		this.save();

		this.eventEmitter.emit('changeBuildConfig', { previous, current: config_name });

	}

	/**
	 * Get the desired runner type.
	 * @returns {RuntimeBuildType}
	 */
	static get runtimeBuildTypeOrDef() {
		return this.runtimeBuildType ?? Preferences.runtimeBuildType;
	}

	/**
	 * Get the desired runner type for this project (without falling back to the global option).
	 * @returns {RuntimeBuildType|undefined}
	 */
	static get runtimeBuildType() {
		return properties.runner;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	static get reuseCompilerTabOrDef() {
		return this.reuseCompilerTab ?? Preferences.reuseCompilerTab;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean|undefined}
	 */
	static get reuseCompilerTab() {
		return properties.reuse_compiler_tab;
	}

	/**
	 * Set whether to reuse a compiler tab.
	 * @param {Boolean|undefined} reuse_compiler_tab 
	 */
	static set reuseCompilerTab(reuse_compiler_tab) {
		properties.reuse_compiler_tab = reuse_compiler_tab;
		this.save();
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {RuntimeBuildType|undefined} runner 
	 */
	static set runtimeBuildType(runner) {

		properties.runner = runner;
		this.save();

	}

	/**
	 * Get the desired runtime channel type.
	 * @returns {GMChannelType}
	 */
	static get runtimeChannelTypeOrDef() {
		return properties.runtime_type ?? Preferences.defaultRuntimeChannel;
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {GMChannelType|undefined}
	 */
	static get runtimeChannelType() {
		return properties.runtime_type;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMChannelType|undefined} runtime_type 
	 */
	static set runtimeChannelType(runtime_type) {

		properties.runtime_type = runtime_type;
		this.save();

	}

	/**
	 * Get the desired runtime version for this project.
	 * @returns {string|null}
	 */
	static get runtimeVersionOrDef() {
		return properties.runtime_version ?? Preferences.getRuntimeVersion(this.runtimeChannelTypeOrDef);
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {string|undefined}
	 */
	static get runtimeVersion() {
		return properties.runtime_version;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {string|undefined} runtime_type 
	 */
	static set runtimeVersion(runtime_type) {

		properties.runtime_version = runtime_type;
		this.save();

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<RuntimeInfo>}
	 */
	static get runtime() {

		const type = this.runtimeChannelTypeOrDef;
		const desired_runtime_list = Preferences.getRuntimes(type);

		if (desired_runtime_list === null) {
			return {
				ok: false,
				err: new Err(`Runtime type ${type} list not loaded!`)
			};
		}

		const version = this.runtimeVersionOrDef ?? desired_runtime_list[0]?.version?.toString();
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
	static get user() {

		const type = this.runtimeChannelTypeOrDef;
		const desired_user_list = Preferences.getUsers(type);

		if (desired_user_list === null) {
			return {
				ok: false,
				err: new Err(`Users for runtime ${type} list not loaded!`)
			};
		}

		const name = Preferences.getUser(type) ?? desired_user_list[0]?.name?.toString();
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
	 * 
	 * @private
	 */
	static onProjectOpen = () => {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		properties = {};

		const saved = project.properties['GMEdit-Constructor'];
		
		if (saved !== undefined && saved !== null) {
			Object.assign(properties, saved);
		}

	}

	/**
	 * @private
	 */
	static onProjectClose = () => {
		
	}

	static __setup__() {
		GMEdit.on('projectOpen', this.onProjectOpen);
		GMEdit.on('projectClose', this.onProjectClose);
	}

	static __cleanup__() {
		GMEdit.off('projectOpen', this.onProjectOpen);
		GMEdit.off('projectClose', this.onProjectClose);
	}

}
