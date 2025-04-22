/**
 * Handler for project-specific preferences.
 */

import { GMRuntimeVersion, GMVersion } from '../compiler/GMVersion.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { project_config_tree_get } from '../utils/project.js';
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
	 * @type {GMVersion}
	 */
	projectVersion;

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
	 * 
	 * @param {GMEdit.Project} project The project this properties instance is for.
	 * @param {GMVersion} projectVersion The format of this project.
	 * @param {Preferences} preferences The global preferences object to reference.
	 * @param {TPreferences.LocalProjectPropertiesStore} localProjectPropertiesStore
	 * @param {ProblemLogger} problemLogger Method of logging problems.
	 */
	constructor(project, projectVersion, preferences, localProjectPropertiesStore, problemLogger) {

		this.problemLogger = problemLogger;
		this.project = project;
		this.projectVersion = projectVersion;
		this.preferences = preferences;
		this.localProjectPropertiesStore = localProjectPropertiesStore;
		this.portable = project.properties['GMEdit-Constructor'] ?? {};
		this.local = this.localProjectPropertiesStore.load();

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
		return project_config_tree_get(this.project);
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
	 * Whether to reuse a compiler tab.
	 * @returns {Boolean}
	 */
	get reuseOutputTabOrDef() {
		return this.reuseOutputTab ?? this.preferences.reuseOutputTab;
	}

	/**
	 * This project's specified preference for reusing output tabs.
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
	 * The user-specified runtime version for this project, if any.
	 * 
	 * @returns {GMRuntimeVersion|undefined}
	 */
	get runtimeVersion() {

		const channel = this.runtimeChannelType;

		// If no channel is specified, this value is meaningless.
		if (channel === undefined) {
			return undefined;
		}

		const versionString = this.portable.runtime_version;

		if (versionString == undefined) {
			return undefined;
		}

		const version = GMRuntimeVersion.parse(versionString);

		if (!version.ok) {
			return undefined;
		}

		return version.data;

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
		this.localProjectPropertiesStore.save(this.local);
	}

	/**
	 * Deselect the current runtime version when changing runtime channel.
	 * @private
	 */
	onChangeRuntimeChannel = () => {
		this.runtimeVersion = undefined;
	};

}
