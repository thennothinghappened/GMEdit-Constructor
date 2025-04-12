/**
 * Handler for project-specific preferences.
 */

import { GMConstructor } from '../GMConstructor.js';
import { Err, InvalidStateErr } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_config_tree_get, project_current_get } from '../utils/project.js';
import { Preferences } from './Preferences.js';

const GMEditProjectProperties = $gmedit['ui.project.ProjectProperties'];

export class ProjectProperties {

	/**
	 * The project for which these properties are associated.
	 * @type {GMEdit.Project}
	 */
	project;

	/**
	 * The current properties instance.
	 * 
	 * @private
	 * @type {Partial<TPreferences.ProjectData>}
	 */
	properties;

	/**
	 * @readonly
	 * @private
	 * @type {EventEmitterImpl<TPreferences.ProjectPropertiesEventMap>}
	 */
	eventEmitter = new EventEmitterImpl([
		'changeBuildConfig',
		'changeRuntimeChannel',
		'changeRuntimeVersion'
	]);

	/**
	 * @private
	 * @param {GMEdit.Project} project
	 */
	constructor(project) {

		this.project = project;
		this.properties = project.properties['GMEdit-Constructor'] ?? {};

		this.events.on('changeRuntimeChannel', this.onChangeRuntimeChannel);
		
	}

	/**
	 * Clean up this properties instance.
	 * @private
	 */
	destroy() {
		this.events.off('changeRuntimeChannel', this.onChangeRuntimeChannel);
	}

	/**
	 * @returns {EventEmitter<TPreferences.ProjectPropertiesEventMap>}
	 */
	get events() {
		return this.eventEmitter;
	}

	/**
	 * Get the active compile config name.
	 * @returns {string}
	 */
	get buildConfigName() {
		return this.properties.config_name ?? 'Default';
	}

	/**
	 * The root build configuration of the project.
	 * @returns {ProjectYYConfig}
	 */
	get rootBuildConfig() {

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
	set buildConfigName(config_name) {

		const previous = this.properties.config_name;

		this.properties.config_name = config_name;
		this.save();

		this.eventEmitter.emit('changeBuildConfig', { previous, current: config_name });

	}

	/**
	 * Get the desired runner type.
	 * @returns {Zeus.RuntimeType}
	 */
	get runtimeBuildTypeOrDef() {
		return this.runtimeBuildType ?? Preferences.runtimeBuildType;
	}

	/**
	 * Get the desired runner type for this project (without falling back to the global option).
	 * @returns {Zeus.RuntimeType|undefined}
	 */
	get runtimeBuildType() {
		return this.properties.runner ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {Zeus.RuntimeType|undefined} runner 
	 */
	set runtimeBuildType(runner) {
		this.properties.runner = runner;
		this.save();
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	get reuseCompilerTabOrDef() {
		return this.reuseCompilerTab ?? Preferences.reuseCompilerTab;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean|undefined}
	 */
	get reuseCompilerTab() {
		return this.properties.reuse_compiler_tab ?? undefined;
	}

	/**
	 * Set whether to reuse a compiler tab.
	 * @param {Boolean|undefined} reuse_compiler_tab 
	 */
	set reuseCompilerTab(reuse_compiler_tab) {
		this.properties.reuse_compiler_tab = reuse_compiler_tab;
		this.save();
	}

	/**
	 * Get the desired runtime channel type.
	 * @returns {GMChannelType}
	 */
	get runtimeChannelTypeOrDef() {
		return this.properties.runtime_type ?? Preferences.defaultRuntimeChannel;
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {GMChannelType|undefined}
	 */
	get runtimeChannelType() {
		return this.properties.runtime_type ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMChannelType|undefined} channel 
	 */
	set runtimeChannelType(channel) {

		const previous = this.runtimeChannelType;

		if (previous === channel) {
			return;
		}

		this.properties.runtime_type = channel;
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
	get zeusPlatform() {
		return this.properties.zeus_platform;
	}

	/**
	 * @param {Zeus.Platform|undefined} zeusPlatform 
	 */
	set zeusPlatform(zeusPlatform) {
		this.properties.zeus_platform = zeusPlatform;
		this.save();
	}

	/**
	 * Get the desired runtime version for this project.
	 * @returns {string|undefined}
	 */
	get runtimeVersionOrDef() {
		return this.properties.runtime_version ?? Preferences.getRuntimeVersion(this.runtimeChannelTypeOrDef);
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {string|undefined}
	 */
	get runtimeVersion() {
		return this.properties.runtime_version ?? undefined;
	}

	/**
	 * Set the desired runtime version.
	 * @param {string|undefined} runtime_version 
	 */
	set runtimeVersion(runtime_version) {

		this.properties.runtime_version = runtime_version;

		this.save();
		this.eventEmitter.emit('changeRuntimeVersion', runtime_version);

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<Zeus.RuntimeInfo>}
	 */
	get runtime() {

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
	get user() {

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
	save() {

		// https://github.com/thennothinghappened/GMEdit-Constructor/issues/31:
		// 
		// GMEdit's stringification of `undefined` properties produces `null`, rather than omitting
		// the keys, which means a default value can either be `null` or omission (never set), which
		// is annoying, so we're manually removing these keys.
		for (const [key, value] of Object.entries(this.properties)) {
			if (value == undefined) {
				// @ts-expect-error We're iterating over the keys of `properties`...
				delete this.properties[key];
			}
		}

		this.project.properties['GMEdit-Constructor'] = this.properties;
		GMEditProjectProperties.save(this.project, this.project.properties);

	}

	/**
	 * Deselect the current runtime version when changing runtime channel.
	 * @private
	 */
	onChangeRuntimeChannel = () => {
		this.runtimeVersion = undefined;
	};

	/**
	 * Project properties instances for any open projects.
	 * 
	 * @private
	 * @type {Map<GMEdit.Project, ProjectProperties>}
	 */
	static instances = new Map();

	/**
	 * Get properties for the given project.
	 * 
	 * @param {GMEdit.Project} project The project to get properties for.
	 * @throws {InvalidStateErr} Throws if the given project is not supported, this shouldn't happen.
	 * @returns {ProjectProperties}
	 */
	static get(project) {

		if (!GMConstructor.supportsProjectFormat(project)) {
			throw new InvalidStateErr(`Tried to get properties for project ${project}, but the project is not a supported type`);
		}

		let instance = this.instances.get(project);

		if (instance === undefined) {
			instance = new ProjectProperties(project);
			this.instances.set(project, instance);
		}

		return instance;

	}

	static __setup__() {
		GMEdit.on('projectClose', this.onProjectClose);
	}

	static __cleanup__() {
		
		GMEdit.off('projectClose', this.onProjectClose);
		
		for (const instance of this.instances.values()) {
			instance.destroy();
		}

		this.instances.clear();

	}

	/**
	 * Clean up the properties instance for the project, if one was created.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectOpen']} event
	 */
	static onProjectClose = ({ project }) => {

		const instance = this.instances.get(project);

		if (instance !== undefined) {
			instance.destroy();
			this.instances.delete(project);
		}

	};

}
