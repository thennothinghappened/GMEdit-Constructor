import { use } from '../../utils/scope-extensions/use.js';
import { UIDropdownGetValue, UIDropdownMutate, UIDropdownSetValue } from '../../utils/gmedit/UIPreferencesUtils.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { project_config_tree_flatten } from '../../utils/project.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import { runtime_channel_get_versions } from './PreferencesMenu.js';
import { GMConstructor, plugin_name } from '../../GMConstructor.js';
import { Dropdown } from '../components/Dropdown.js';
import { ControlPanelTab } from '../tabs/ControlPanelTab.js';
import { Err } from '../../utils/Err.js';
import { mapToOption, Some } from '../../utils/Option.js';

const UIPreferences = $gmedit['ui.Preferences'];

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
 * User interface for managing project-specific properties.
 */
export class ProjectPropertiesMenu {

	/**
	 * The project properties associated with this instance.
	 * @type {ProjectProperties}
	 */
	properties;

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
	 * @type {Components.IDropdown<Zeus.Platform|undefined>}
	 */
	platformDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<Zeus.RuntimeType|undefined>}
	 */
	zeusRuntimeTypeDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<GMChannelType|undefined>}
	 */
	zeusReleaseChannelDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<string|undefined>}
	 */
	runtimeVersionDropdown;

	/**
	 * @private
	 * @type {Components.IDropdown<boolean|undefined>}
	 */
	reuseCompileTabDropdown;

	/**
	 * @param {ProjectProperties} properties
	 */
	constructor(properties) {

		this.properties = properties;

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

		const runtimeVersions = use(this.properties.runtimeChannelType)
			?.let(channel => runtime_channel_get_versions(channel))
			?.value
			?? [];

		this.runtimeVersionDropdown = new Dropdown('Runtime Version',
			Some(this.properties.runtimeVersion),
			(value) => { this.properties.runtimeVersion = value; },
			[USE_DEFAULT, ...runtimeVersions]
		);
		
		this.runtimeVersionDropdown.element.classList.add('singleline');
		this.runtimeVersionDropdown.element.hidden = (this.properties.runtimeChannelType === undefined);
		this.element.appendChild(this.runtimeVersionDropdown.element);

		// ------------------------------------------------------------------------------
		
		this.reuseCompileTabDropdown = use(new Dropdown('Reuse existing compiler tab',
			Some(this.properties.reuseCompilerTab),
			(value) => { this.properties.reuseCompilerTab = value; },
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
		Preferences.events.on('runtimeListChanged', this.onRuntimeListChanged);

	}

	/**
	 * Clean up our event listens.
	 */
	destroy() {
		this.properties.events.off('setBuildConfig', this.onChangeBuildConfig);
		this.properties.events.off('setRuntimeChannel', this.onChangeRuntimeChannel);
		Preferences.events.off('runtimeListChanged', this.onRuntimeListChanged);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setBuildConfig']} event
	 */
	onChangeBuildConfig = ({ current }) => {
		this.buildConfigDropdown.setSelectedOption(current);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setRuntimeChannel']} channel
	 */
	onChangeRuntimeChannel = ({ channel }) => {

		this.updateChannel(channel);
		this.runtimeVersionDropdown.element.hidden = (channel === undefined);

		if (channel !== undefined) {
			this.updateRuntimeVersionList(channel);
		}

	};

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['runtimeListChanged']} event
	 */
	onRuntimeListChanged = ({ channel }) => {
		if (this.properties.runtimeChannelType === channel) {
			this.updateRuntimeVersionList(channel);
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
	 * @param {GMChannelType} channel 
	 */
	updateRuntimeVersionList(channel) {
		this.runtimeVersionDropdown.setOptions([
			USE_DEFAULT,
			...runtime_channel_get_versions(channel)
		]);
	}

	/**
	 * Instance to be used for displaying in GMEdit's own Project Properties screen.
	 * 
	 * @private
	 * @type {ProjectPropertiesMenu|undefined}
	 */
	static instance = undefined;

	/**
	 * The group that holds the instance's element.
	 * 
	 * @private
	 * @type {HTMLFieldSetElement|undefined}
	 */
	static group = undefined;

	/**
	 * Deploy the singleton instance to the tab.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectPropertiesBuilt']} event
	 */
	static deploy = ({ target, project }) => {

		if (!GMConstructor.supportsProjectFormat(project)) {
			return;
		}

		if (this.instance === undefined || this.instance.properties.project !== project) {
			this.instance?.destroy();
			this.instance = new ProjectPropertiesMenu(ProjectProperties.get(project));
		}

		if (this.group !== undefined) {
			this.group.remove();
			target.appendChild(this.group);
		} else {
			this.group = UIPreferences.addGroup(target, plugin_name);
			this.group.appendChild(this.instance.element);
		}
		
	};

	/**
	 * @private
	 */
	static onCloseProject = () => this.instance?.destroy();

	static __setup__() {
		GMEdit.on('projectPropertiesBuilt', this.deploy);
		GMEdit.on('projectClose', this.onCloseProject);
	}

	static __cleanup__() {

		GMEdit.off('projectPropertiesBuilt', this.deploy);
		GMEdit.off('projectClose', this.onCloseProject);

		this.instance?.destroy();
		this.group?.remove();

	}

}
