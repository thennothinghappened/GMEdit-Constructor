import { use } from '../../utils/scope-extensions/use.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { project_config_tree_flatten } from '../../utils/project.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import { Dropdown } from '../components/Dropdown.js';
import { Some } from '../../utils/Option.js';
import { GMRuntimeVersion } from '../../compiler/GMVersion.js';

/**
 * Used for runtime/user select dropdowns, to default to the global settings.
 * Corresponds to `undefined` in the actual preferences files.
 * 
 * @type {Components.NormalizedDropdownEntry<undefined>}
 */
const USE_DEFAULT = {
	label: 'Use Default',
	value: undefined
};

/**
 * @type {Components.NormalizedDropdownEntry<undefined>}
 */
const USE_COMPATIBLE_RUNTIME = {
	label: 'Pick a compatible runtime',
	value: undefined
};

/**
 * User interface for managing project-specific properties.
 */
export class ProjectPropertiesMenu {

	/**
	 * The project properties associated with this instance.
	 * @type {ProjectProperties}
	 */
	properties;

	/**
	 * The preferences provider.
	 * @type {Preferences}
	 */
	preferences;

	/**
	 * @readonly
	 * @type {HTMLDivElement}
	 */
	element = document.createElement('div');

	/**
	 * @private
	 */
	subtitle = document.createElement('em');

	/**
	 * @private
	 * @type {Components.IDropdown<string>}
	 */
	buildConfigDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<GMS2.Platform|undefined>}
	 */
	platformDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<GMS2.RuntimeType|undefined>}
	 */
	zeusRuntimeTypeDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<GMChannelType|undefined>}
	 */
	zeusReleaseChannelDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<GMRuntimeVersion|undefined>}
	 */
	runtimeVersionDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<boolean|undefined>}
	 */
	reuseOutputTabDropdown;

	/**
	 * @param {ProjectProperties} properties
	 * @param {Preferences} preferences 
	 */
	constructor(properties, preferences) {

		this.properties = properties;
		this.preferences = preferences;

		this.subtitle.textContent = `Configure behaviour for ${properties.project.displayName}.`;
		this.element.appendChild(this.subtitle);

		// ------------------------------------------------------------------------------

		this.buildConfigDropdown = new Dropdown('Build Configuration',
			Some(this.properties.buildConfigName),
			(config_name) => { this.properties.buildConfigName = config_name; },
			project_config_tree_flatten(this.properties.rootBuildConfig)
		);

		this.buildConfigDropdown.element.classList.add('singleline');
		this.element.appendChild(this.buildConfigDropdown.element);

		// ------------------------------------------------------------------------------

		this.platformDropdown = new Dropdown('Runner Platform',
			Some(this.properties.zeusPlatform),
			(value) => { this.properties.zeusPlatform = value; },
			[
				{ label: 'Current Platform', value: undefined },
				'HTML5',
				'OperaGX',
			]
		);
		
		this.platformDropdown.element.classList.add('singleline');
		this.element.appendChild(this.platformDropdown.element);

		// ------------------------------------------------------------------------------

		this.zeusRuntimeTypeDropdown = new Dropdown('Runtime Type',
			Some(this.properties.runtimeBuildType),
			(value) => { this.properties.runtimeBuildType = value; },
			[USE_DEFAULT, ...ZEUS_RUNTIME_TYPES]
		);
		
		this.zeusRuntimeTypeDropdown.element.classList.add('singleline');
		this.element.appendChild(this.zeusRuntimeTypeDropdown.element);

		// ------------------------------------------------------------------------------

		this.zeusReleaseChannelDropdown = new Dropdown('Runtime Release Channel',
			Some(this.properties.runtimeChannelType),
			(value) => { this.properties.runtimeChannelType = value; },
			[USE_DEFAULT, ...GM_CHANNEL_TYPES]
		);
		
		this.zeusReleaseChannelDropdown.element.classList.add('singleline');
		this.element.appendChild(this.zeusReleaseChannelDropdown.element);

		// ------------------------------------------------------------------------------

		this.runtimeVersionDropdown = new Dropdown('Runtime Version',
			Some(this.properties.runtimeVersion),
			(value) => { this.properties.runtimeVersion = value; },
			[USE_COMPATIBLE_RUNTIME, ...this.mapRuntimesInChannelToEntries() ?? []],
			(a, b) => a.equals(b)
		);
		
		this.runtimeVersionDropdown.element.classList.add('singleline');
		this.runtimeVersionDropdown.element.hidden = (this.properties.runtimeChannelType === undefined);
		this.element.appendChild(this.runtimeVersionDropdown.element);

		// ------------------------------------------------------------------------------
		
		this.reuseOutputTabDropdown = use(new Dropdown('Reuse existing compiler tab',
			Some(this.properties.reuseOutputTab),
			(value) => { this.properties.reuseOutputTab = value; },
			[
				USE_DEFAULT,
				{ label: 'Yes', value: true },
				{ label: 'No', value: false }
			],
		)).also(it => {
			it.element.classList.add('singleline');
			this.element.appendChild(it.element);
		}).value;

		// ------------------------------------------------------------------------------

		this.properties.events.on('setBuildConfig', this.onChangeBuildConfig);
		this.properties.events.on('setRuntimeChannel', this.onChangeRuntimeChannel);
		this.properties.events.on('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.on('runtimeListChanged', this.onRuntimeListChanged);

	}

	/**
	 * Clean up our event listens.
	 */
	destroy() {
		this.properties.events.off('setBuildConfig', this.onChangeBuildConfig);
		this.properties.events.off('setRuntimeChannel', this.onChangeRuntimeChannel);
		this.properties.events.off('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.off('runtimeListChanged', this.onRuntimeListChanged);
	};

	/**
	 * @private
	 * @returns {Components.NormalizedDropdownEntry<GMRuntimeVersion>[]|undefined}
	 */
	mapRuntimesInChannelToEntries() {
		
		const channel = this.properties.runtimeChannelType;

		if (channel === undefined) {
			return undefined;
		}

		return this.preferences.getInstalledRuntimeVersions(channel)?.map(runtime => ({
			label: runtime.version.toString(),
			value: runtime.version
		}));

	}

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setBuildConfig']} event
	 */
	onChangeBuildConfig = ({ current }) => {
		this.buildConfigDropdown.setSelectedOption(current);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setRuntimeChannel']} event
	 */
	onChangeRuntimeChannel = ({ channel }) => {

		this.updateChannel(channel);
		this.runtimeVersionDropdown.element.hidden = (channel === undefined);

		if (channel !== undefined) {
			this.updateRuntimeVersionList();
		}

	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setReuseOutputTab']} event
	 */
	onSetReuseOutputTab = ({ reuseOutputTab }) => {
		this.reuseOutputTabDropdown.setSelectedOption(reuseOutputTab);
	};

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['runtimeListChanged']} event
	 */
	onRuntimeListChanged = ({ channel }) => {
		if (this.properties.runtimeChannelType === channel) {
			this.updateRuntimeVersionList();
		}
	};

	/**
	 * @private
	 * @param {GMChannelType|undefined} channel
	 */
	updateChannel(channel) {
		this.zeusReleaseChannelDropdown.setSelectedOption(channel);
	}

	/**
	 * @private
	 */
	updateRuntimeVersionList() {
		this.runtimeVersionDropdown.setOptions([
			USE_COMPATIBLE_RUNTIME,
			...this.mapRuntimesInChannelToEntries() ?? []
		], this.properties.runtimeVersion);
	}

}
