/**
 * Handler for project-specific preferences.
 */

import { GMRuntimeVersion } from '../compiler/GMVersion.js';
import { GMConstructor } from '../GMConstructor.js';
import { BaseError, InvalidStateErr, SolvableError } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_config_tree_get, project_current_get, project_format_get } from '../utils/project.js';
import { Err, Ok } from '../utils/Result.js';
import { docString } from '../utils/StringUtils.js';
import { Preferences } from './Preferences.js';

const GMEditProjectProperties = $gmedit['ui.project.ProjectProperties'];

export class ProjectProperties {

	/**
	 * The project for which these properties are associated.
	 * 
	 * @readonly
	 * @type {GMEdit.Project}
	 */
	project;

	/**
	 * The GM metadata format of this project, which determines what runtimes are compatible.
	 * 
	 * @readonly
	 * @type {SupportedProjectFormat}
	 */
	projectFormat;

	/**
	 * The global preferences handler.
	 * 
	 * @private
	 * @readonly
	 * @type {Preferences}
	 */
	preferences;

	/**
	 * @private
	 * @readonly
	 * @type {ProblemLogger}
	 */
	problemLogger;

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
		'setRuntimeVersion',
		'setReuseOutputTab'
	]);

	/**
	 * @private
	 * @param {GMEdit.Project} project The project this properties instance is for.
	 * @param {SupportedProjectFormat} projectFormat The format of this project.
	 * @param {Preferences} preferences The global preferences object to reference.
	 * @param {ProblemLogger} problemLogger Method of logging problems.
	 */
	constructor(project, projectFormat, preferences, problemLogger) {

		this.problemLogger = problemLogger;
		this.project = project;
		this.projectFormat = projectFormat;
		this.preferences = preferences;
		this.portable = project.properties['GMEdit-Constructor'] ?? {};
		this.local = this.preferences.loadProjectLocalProps(this.project);

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
	 * @returns {GMS2.RuntimeType}
	 */
	get runtimeBuildTypeOrDef() {
		return this.runtimeBuildType ?? this.preferences.runtimeBuildType;
	}

	/**
	 * Get the desired runner type for this project (without falling back to the global option).
	 * @returns {GMS2.RuntimeType|undefined}
	 */
	get runtimeBuildType() {
		return this.local.runtimeType ?? undefined;
	}

	/**
	 * Set the desired runtime channel type.
	 * @param {GMS2.RuntimeType|undefined} runner 
	 */
	set runtimeBuildType(runner) {
		this.local.runtimeType = runner;
		this.saveLocalProps();
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	get reuseOutputTabOrDef() {
		return this.reuseOutputTab ?? this.preferences.reuseOutputTab;
	}

	/**
	 * Get whether to reuse a compiler tab.
	 * @returns {Boolean|undefined}
	 */
	get reuseOutputTab() {
		return this.local.reuseOutputTab ?? undefined;
	}

	/**
	 * Set whether to reuse a compiler tab.
	 * @param {Boolean|undefined} value 
	 */
	set reuseOutputTab(value) {
		
		this.local.reuseOutputTab = value;
		this.saveLocalProps();

		this.eventEmitter.emit('setReuseOutputTab', { reuseOutputTab: value });
		
	}

	/**
	 * Get the desired runtime channel type.
	 * @returns {GMChannelType}
	 */
	get runtimeChannelTypeOrDef() {
		return this.portable.runtime_type ?? this.preferences.defaultRuntimeChannel;
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
	 * @returns {GMS2.Platform|undefined}
	 */
	get zeusPlatform() {
		return this.local.platform;
	}

	/**
	 * @param {GMS2.Platform|undefined} zeusPlatform 
	 */
	set zeusPlatform(zeusPlatform) {
		this.local.platform = zeusPlatform;
		this.saveLocalProps();
	}

	/**
	 * The runtime version to build this project with.
	 * @returns {GMS2.RuntimeInfo|undefined}
	 */
	get runtimeVersionOrDef() {
		return this.runtimeVersion ?? this.preferences.getPreferredRuntimeVersion(this.runtimeChannelTypeOrDef);
	}

	/**
	 * The user-specified runtime version for this project, if any.
	 * 
	 * @returns {GMS2.RuntimeInfo|undefined}
	 */
	get runtimeVersion() {

		// FIXME: I'm not really too pleased with this setup. Doing magical validity-checking which
		// prints a message automatically behind the scenes on a getter isn't that great. IMO this
		// should be merged into the `runtime` getter (which itself should not be a getter either).

		const channel = this.runtimeChannelType;

		// If no channel is specified, this value is meaningless.
		if (channel === undefined) {
			return undefined;
		}

		const versionString = this.portable.runtime_version;

		if (versionString == undefined) {
			return undefined;
		}

		const runtimeInfoRes = this.preferences.getRuntimeInfo(channel, versionString);

		if (!runtimeInfoRes.ok) {

			this.problemLogger.error('Project\'s selected Runtime is not installed!', new SolvableError(
				docString(`
					This project specifies the runtime version '${versionString}', but this version
					doesn't appear to be installed.
					
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

		return runtimeInfoRes.data;

	}

	/**
	 * Set the desired runtime version.
	 * @param {GMRuntimeVersion|undefined} version 
	 */
	set runtimeVersion(version) {

		this.portable.runtime_version = version?.toString();

		this.savePortableProps();
		this.eventEmitter.emit('setRuntimeVersion', { version });

	}

	/**
	 * Get the runtime version to use for the current project.
	 * @returns {Result<GMS2.RuntimeInfo>}
	 */
	get runtime() {

		const runtime = this.runtimeVersionOrDef;
		
		if (runtime !== undefined) {
			return Ok(runtime);
		}

		const channel = this.runtimeChannelTypeOrDef;
		const runtimes = this.preferences.getInstalledRuntimeVersions(channel);

		if (runtimes === undefined) {
			return Err(new BaseError(`Runtime type ${channel} list not loaded!`));
		}

		const compatibleRuntimes = runtimes.filter(it => it.version.format === this.projectFormat);

		if (compatibleRuntimes.length > 0) {
			return Ok(compatibleRuntimes[0]);
		}

		return Err(new BaseError(`Failed to find any runtimes of type ${channel}`));

	}

	/**
	 * Get the user to use for the current project.
	 * @returns {Result<UserInfo>}
	 */
	get user() {

		const channel = this.runtimeChannelTypeOrDef;
		const user = this.preferences.getUser(channel);

		if (user !== undefined) {
			return Ok(user);
		}

		const users = this.preferences.getUsers(channel);
		
		if (users === undefined) {
			return Err(new BaseError(`Users for runtime ${channel} list not loaded!`));
		}

		return Ok(users[0]);

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
		this.preferences.saveProjectLocalProps(this.project, this.local);
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
	 * @type {Map<GMEdit.Project, Result<ProjectProperties, TPreferences.ProjectPropertiesGetError>>}
	 */
	static instances = new Map();

	/**
	 * The global preferences handler, to be injected into instances.
	 * 
	 * @private
	 * @type {Preferences}
	 */
	static preferences;

	/**
	 * @private
	 * @type {ProblemLogger}
	 */
	static problemLogger;

	/**
	 * Get properties for the given project, if the project is supported.
	 * 
	 * @param {GMEdit.Project} project The project to get properties for.
	 * @returns {Result<ProjectProperties, TPreferences.ProjectPropertiesGetError>}
	 */
	static get(project) {

		let result = this.instances.get(project);

		if (result !== undefined) {
			return result;
		}

		if (!GMConstructor.supportsProjectFormat(project)) {

			result = Err({
				isPluginError: false,
				error: new BaseError(`The format of the project "${project.name}" is not supported`)
			});

			this.instances.set(project, result);
			return result;

		}

		const projectFormat = project_format_get(project);

		if (!projectFormat.ok) {
			
			result = Err({
				isPluginError: true,
				error: new InvalidStateErr(
					`Failed to parse project format of project "${project.name}"`,
					projectFormat.err
				)
			});

			this.problemLogger.error('Plugin Internal Error!', result.err.error);

			this.instances.set(project, result);
			return result;

		}

		if (projectFormat.data === '[Unsupported]') {

			result = Err({
				isPluginError: false,
				error: new BaseError(`The format of the project "${project.name}" is not supported`)
			});

			this.instances.set(project, result);
			return result;

		}

		const projectProperties = new ProjectProperties(
			project,
			projectFormat.data,
			this.preferences,
			this.problemLogger
		);

		result = Ok(projectProperties);
		this.instances.set(project, result);

		return result;


	}

	/**
	 * @param {Preferences} preferences Preferences instance to inject.
	 * @param {ProblemLogger} problemLogger Problem logging method.
	 */
	static __setup__(preferences, problemLogger) {
		
		this.preferences = preferences;
		this.problemLogger = problemLogger;

		GMEdit.on('projectClose', this.onProjectClose);

	}

	static __cleanup__() {
		
		GMEdit.off('projectClose', this.onProjectClose);
		
		for (const instance of this.instances.values()) {
			if (instance.ok) {
				instance.data.destroy();
			}
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

			if (instance.ok) {
				instance.data.destroy();
			}

			this.instances.delete(project);

		}

	};

}
