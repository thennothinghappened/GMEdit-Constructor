/**
 * Handler for project-specific preferences.
 */

import { Err } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_config_tree_get, project_current_get } from '../utils/project.js';
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
	static eventEmitter = new EventEmitterImpl([
		'changeBuildConfig',
		'changeRuntimeChannel',
		'changeRuntimeVersion'
	]);

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
	static get buildConfigName() {
		return properties.config_name ?? 'Default';
	}

	/**
	 * The root build configuration of the project.
	 * @returns {ProjectYYConfig}
	 */
	static get rootBuildConfig() {

		const project = project_current_get();

		if (project === undefined) {
			return {
				name: 'Default',
				children: []
			};
		}

		return project_config_tree_get(project);

	}

	/**
	 * Set the active compile config name.
	 * @param {string} config_name 
	 */
	static set buildConfigName(config_name) {

		const previous = properties.config_name;

		properties.config_name = config_name;
		this.save();

		this.eventEmitter.emit('changeBuildConfig', { previous, current: config_name });

	}

	/**
	 * Get the desired runner type.
	 * @returns {Zeus.RuntimeType}
	 */
	static get runtimeBuildTypeOrDef() {
		return this.runtimeBuildType ?? Preferences.runtimeBuildType;
	}

	/**
	 * Get the desired runner type for this project (without falling back to the global option).
	 * @returns {Zeus.RuntimeType|undefined}
	 */
	static get runtimeBuildType() {
		return properties.runner ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {Zeus.RuntimeType|undefined} runner 
	 */
	static set runtimeBuildType(runner) {
		properties.runner = runner;
		this.save();
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
		return properties.reuse_compiler_tab ?? undefined;
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
		return properties.runtime_type ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMChannelType|undefined} channel 
	 */
	static set runtimeChannelType(channel) {

		const previous = this.runtimeChannelType;

		if (previous === channel) {
			return;
		}

		properties.runtime_type = channel;
		this.save();
		
		let isNetChange = true;
		
		if (previous === undefined && channel === Preferences.defaultRuntimeChannel) {
			// No net change: changed from implicit default to explicit default.
			isNetChange = false;
		}
		
		if (channel === undefined && previous === Preferences.defaultRuntimeChannel) {
			// No net change: changed from explicit default to implicit default.
			isNetChange = false;
		}
		
		// @ts-expect-error Check above ensures this only fires when a change has actually happened.
		this.eventEmitter.emit('changeRuntimeChannel', { previous, channel, isNetChange });

	}

	/**
	 * The target platform for this project when using the current runtime. If undefined, the host
	 * platform is assumed.
	 * 
	 * @returns {Zeus.Platform|undefined}
	 */
	static get zeusPlatform() {
		return properties.zeus_platform;
	}

	/**
	 * @param {Zeus.Platform|undefined} zeusPlatform 
	 */
	static set zeusPlatform(zeusPlatform) {
		properties.zeus_platform = zeusPlatform;
		this.save();
	}

	/**
	 * Get the desired runtime version for this project.
	 * @returns {string|undefined}
	 */
	static get runtimeVersionOrDef() {
		return properties.runtime_version ?? Preferences.getRuntimeVersion(this.runtimeChannelTypeOrDef);
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {string|undefined}
	 */
	static get runtimeVersion() {
		return properties.runtime_version ?? undefined;
	}

	/**
	 * Set the desired runtime version.
	 * @param {string|undefined} runtime_version 
	 */
	static set runtimeVersion(runtime_version) {

		properties.runtime_version = runtime_version;

		this.save();
		this.eventEmitter.emit('changeRuntimeVersion', runtime_version);

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<Zeus.RuntimeInfo>}
	 */
	static get runtime() {

		const type = this.runtimeChannelTypeOrDef;
		const desired_runtime_list = Preferences.getRuntimes(type);

		if (desired_runtime_list === undefined) {
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
		const users = Preferences.getUsers(type);

		if (users === undefined) {
			return {
				ok: false,
				err: new Err(`Users for runtime ${type} list not loaded!`)
			};
		}

		const name = Preferences.getUser(type) ?? users[0]?.name?.toString();
		const user = users.find(user => user.name.toString() === name);

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

		if (!project.isGMS23) {
			return;
		}

		properties = {};

		const saved = project.properties['GMEdit-Constructor'];
		
		if (saved !== undefined && saved !== null) {
			Object.assign(properties, saved);
		}

	};

	/**
	 * @private
	 */
	static onProjectClose = () => {

	};

	/**
	 * Deselect the current runtime version when changing runtime channel.
	 * @private
	 */
	static onChangeRuntimeChannel = () => {
		this.runtimeVersion = undefined;
	};

	static __setup__() {

		GMEdit.on('projectOpen', this.onProjectOpen);
		GMEdit.on('projectClose', this.onProjectClose);

		this.events.on('changeRuntimeChannel', this.onChangeRuntimeChannel);

	}

	static __cleanup__() {
		
		GMEdit.off('projectOpen', this.onProjectOpen);
		GMEdit.off('projectClose', this.onProjectClose);

		this.events.off('changeRuntimeChannel', this.onChangeRuntimeChannel);

	}

}
