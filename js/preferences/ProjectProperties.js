/**
 * Handler for project-specific preferences.
 */

import { GMConstructor } from '../GMConstructor.js';
import { ControlPanelTab } from '../ui/tabs/ControlPanelTab.js';
import { BaseError, InvalidStateErr, SolvableError } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_config_tree_get, project_current_get } from '../utils/project.js';
import { Error, Ok } from '../utils/Result.js';
import { docString, trimIndent } from '../utils/StringUtils.js';
import { Preferences } from './Preferences.js';

const GMEditProjectProperties = $gmedit['ui.project.ProjectProperties'];

export class ProjectProperties {

	/**
	 * The project for which these properties are associated.
	 * @type {GMEdit.Project}
	 */
	project;

	/**
	 * Portable properties between users on this project.
	 * 
	 * @private
	 * @type {Partial<TPreferences.Project.PortableData>}
	 */
	portable;

	/**
	 * Local properties stored for this computer only.
	 * 
	 * @private
	 * @type {Partial<TPreferences.Project.LocalData>}
	 */
	local;

	/**
	 * @readonly
	 * @private
	 * @type {EventEmitterImpl<TPreferences.ProjectPropertiesEventMap>}
	 */
	eventEmitter = new EventEmitterImpl([
		'setBuildConfig',
		'setRuntimeChannel',
		'setRuntimeVersion'
	]);

	/**
	 * @private
	 * @param {GMEdit.Project} project
	 */
	constructor(project) {

		this.project = project;
		this.portable = project.properties['GMEdit-Constructor'] ?? {};
		this.local = Preferences.loadProjectLocalProps(this.project);

		this.events.on('setRuntimeChannel', this.onChangeRuntimeChannel);
		
	}

	/**
	 * Clean up this properties instance.
	 * @private
	 */
	destroy() {
		this.events.off('setRuntimeChannel', this.onChangeRuntimeChannel);
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
		return this.local.buildConfig ?? 'Default';
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
	 * @param {string} buildConfig 
	 */
	set buildConfigName(buildConfig) {

		const previous = this.local.buildConfig;

		this.local.buildConfig = buildConfig;
		this.saveLocalProps();

		this.eventEmitter.emit('setBuildConfig', { previous, current: buildConfig });

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
		return this.local.runtimeType ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {Zeus.RuntimeType|undefined} runner 
	 */
	set runtimeBuildType(runner) {
		this.local.runtimeType = runner;
		this.saveLocalProps();
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
		return this.local.reuseOutputTab ?? undefined;
	}

	/**
	 * Set whether to reuse a compiler tab.
	 * @param {Boolean|undefined} reuse_compiler_tab 
	 */
	set reuseCompilerTab(reuse_compiler_tab) {
		this.local.reuseOutputTab = reuse_compiler_tab;
		this.saveLocalProps();
	}

	/**
	 * Get the desired runtime channel type.
	 * @returns {GMChannelType}
	 */
	get runtimeChannelTypeOrDef() {
		return this.portable.runtime_type ?? Preferences.defaultRuntimeChannel;
	}

	/**
	 * Get the desired runtime channel type for this project (without falling back to the global option).
	 * @returns {GMChannelType|undefined}
	 */
	get runtimeChannelType() {
		return this.portable.runtime_type ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMChannelType|undefined} channel 
	 */
	set runtimeChannelType(channel) {

		if (this.runtimeChannelType === channel) {
			return;
		}

		this.portable.runtime_type = channel;
		this.savePortableProps();
		
		this.eventEmitter.emit('setRuntimeChannel', { channel });

	}

	/**
	 * The target platform for this project when using the current runtime. If undefined, the host
	 * platform is assumed.
	 * 
	 * @returns {Zeus.Platform|undefined}
	 */
	get zeusPlatform() {
		return this.local.platform;
	}

	/**
	 * @param {Zeus.Platform|undefined} zeusPlatform 
	 */
	set zeusPlatform(zeusPlatform) {
		this.local.platform = zeusPlatform;
		this.saveLocalProps();
	}

	/**
	 * The runtime version to build this project with.
	 * @returns {string|undefined}
	 */
	get runtimeVersionOrDef() {
		return this.runtimeVersion ?? Preferences.getRuntimeVersion(this.runtimeChannelTypeOrDef);
	}

	/**
	 * The user-specified runtime version for this project, if any.
	 * 
	 * @returns {string|undefined}
	 */
	get runtimeVersion() {

		// FIXME: I'm not really too pleased with this setup. Doing magical validity-checking which
		// prints a message automatically behind the scenes on a getter isn't that great. IMO this
		// should be merged into the `runtime` getter (which itself should not be a getter either).

		// If no channel is specified, this value is meaningless.
		if (this.runtimeChannelType === undefined) {
			return undefined;
		}

		const version = this.portable.runtime_version;

		if (version == undefined) {
			return undefined;
		}

		const runtimes = Preferences.getRuntimes(this.runtimeChannelType);

		if (runtimes === undefined) {
			return undefined;
		}

		if (runtimes.find(it => it.version.toString() === version) === undefined) {
		
			ControlPanelTab.error('Project\'s selected Runtime is not installed!', new SolvableError(
				docString(`
					This project specifies the runtime version '${version}', but this version
					doesn\'t appear to be installed.
					
					The default runtime will be used, though the value in the config will not be
					modified unless you do so.
				`),
				docString(`
					Install the runtime in the IDE and reload GMEdit if this is the correct runtime,
					otherwise you may change the value to an installed runtime.
				`)
			));

			return undefined;

		}

		return version;

	}

	/**
	 * Set the desired runtime version.
	 * @param {string|undefined} version 
	 */
	set runtimeVersion(version) {

		this.portable.runtime_version = version;

		this.savePortableProps();
		this.eventEmitter.emit('setRuntimeVersion', { version });

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<Zeus.RuntimeInfo>}
	 */
	get runtime() {

		const type = this.runtimeChannelTypeOrDef;
		const desired_runtime_list = Preferences.getRuntimes(type);

		if (desired_runtime_list === undefined) {
			return Error(new BaseError(`Runtime type ${type} list not loaded!`));
		}

		const version = this.runtimeVersionOrDef ?? desired_runtime_list[0]?.version?.toString();
		const runtime = desired_runtime_list.find(runtime => runtime.version.toString() === version);

		if (runtime === undefined) {
			return Error(new BaseError(`Failed to find any runtimes of type ${type}`));
		}

		return Ok(runtime);

	}

	/**
	 * Get the user to use for the current project.
	 * @returns {Result<UserInfo>}
	 */
	get user() {

		const type = this.runtimeChannelTypeOrDef;
		const users = Preferences.getUsers(type);

		if (users === undefined) {
			return Error(new BaseError(`Users for runtime ${type} list not loaded!`));
		}

		const name = Preferences.getUser(type) ?? users[0]?.name?.toString();
		const user = users.find(user => user.name.toString() === name);

		if (user === undefined) {
			return Error(new BaseError(`Failed to find any users for runtime ${type}`));
		}

		return Ok(user);
	}

	/**
	 * Save the portable project properties.
	 * @private
	 */
	savePortableProps() {

		// https://github.com/thennothinghappened/GMEdit-Constructor/issues/31:
		// 
		// GMEdit's stringification of `undefined` properties produces `null`, rather than omitting
		// the keys, which means a default value can either be `null` or omission (never set), which
		// is annoying, so we're manually removing these keys.
		for (const [key, value] of Object.entries(this.portable)) {
			if (value == undefined) {
				// @ts-expect-error We're iterating over the keys of `properties`...
				delete this.portable[key];
			}
		}

		this.project.properties['GMEdit-Constructor'] = this.portable;
		GMEditProjectProperties.save(this.project, this.project.properties);

	}

	/**
	 * Save the local project properties.
	 * @private
	 */
	saveLocalProps() {
		Preferences.saveProjectLocalProps(this.project, this.local);
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
