import { use } from '../../utils/scope-extensions/use.js';
import { UIDropdownGetValue, UIDropdownMutate, UIDropdownSetValue } from '../../utils/gmedit/UIPreferencesUtils.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { project_config_tree_flatten } from '../../utils/project.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import * as preferencesMenu from './PreferencesMenu.js';
import { GMConstructor, plugin_name } from '../../GMConstructor.js';

const UIPreferences = $gmedit['ui.Preferences'];

/**
 * Used for runtime/user select dropdowns, to default to the global settings.
 * Corresponds to `undefined` in the actual preferences files.
 */
const USE_DEFAULT = 'Use Default';

/**
 * Return the given `value`, but `USE_DEFAULT` gives `undefined`.
 * 
 * @template {string} T
 * @param {T|USE_DEFAULT} value 
 * @returns {T|undefined}
 */
function default_undefined(value) {
	return (value === USE_DEFAULT)
		? undefined
		: value;
}

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
	 * @type {GMEdit.UIDropdown<string>}
	 */
	buildConfigDropdown;

	/**
	 * @private
	 * @type {GMEdit.UIDropdown<Zeus.Platform | 'Current Platform'>}
	 */
	zeusPlatformDropdown;

	/**
	 * @private
	 * @type {GMEdit.UIDropdown<Zeus.RuntimeType | USE_DEFAULT>}
	 */
	zeusRuntimeTypeDropdown;

	/**
	 * @private
	 * @type {GMEdit.UIDropdown<GMChannelType | USE_DEFAULT>}
	 */
	zeusReleaseChannelDropdown;

	/**
	 * @private
	 * @type {GMEdit.UIDropdown<string | USE_DEFAULT>}
	 */
	runtimeVersionDropdown;

	/**
	 * @private
	 * @type {GMEdit.UIDropdown<'Yes' | 'No' | USE_DEFAULT>}
	 */
	reuseCompileTabDropdown;

	/**
	 * @param {ProjectProperties} properties
	 */
	constructor(properties) {

		this.properties = properties;

		this.subtitle.textContent = `Configure behaviour for ${properties.project.displayName}.`;
		this.element.appendChild(this.subtitle);

		this.buildConfigDropdown = UIPreferences.addDropdown(this.element,
			'Build Configuration',
			this.properties.buildConfigName,
			project_config_tree_flatten(this.properties.rootBuildConfig),
			(config_name) => this.properties.buildConfigName = config_name
		);

		this.buildConfigDropdown.classList.add('singleline');

		this.zeusPlatformDropdown = UIPreferences.addDropdown(this.element,
			'Runner Platform',
			this.properties.zeusPlatform ?? 'Current Platform',
			['Current Platform', 'HTML5', 'OperaGX'],
			(value) => this.properties.zeusPlatform = (value === 'Current Platform') ? undefined : value
		)
		
		this.zeusPlatformDropdown.classList.add('singleline');

		this.zeusRuntimeTypeDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Type',
			this.properties.runtimeBuildType ?? USE_DEFAULT,
			[...ZEUS_RUNTIME_TYPES, USE_DEFAULT],
			(value) => this.properties.runtimeBuildType = default_undefined(value)
		);
		
		this.zeusRuntimeTypeDropdown.classList.add('singleline');

		this.zeusReleaseChannelDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Release Channel',
			this.properties.runtimeChannelType ?? USE_DEFAULT,
			[...GM_CHANNEL_TYPES, USE_DEFAULT],
			(value) => this.properties.runtimeChannelType = default_undefined(value)
		);
		
		this.zeusReleaseChannelDropdown.classList.add('singleline');
		
		this.runtimeVersionDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Version',
			this.properties.runtimeVersion ?? USE_DEFAULT,
			[...preferencesMenu.runtime_version_strings_get_for_type(this.properties.runtimeChannelTypeOrDef), USE_DEFAULT],
			(value) => this.properties.runtimeVersion = default_undefined(value)
		);
		
		this.runtimeVersionDropdown.classList.add('singleline');
		
		this.reuseCompileTabDropdown = UIPreferences.addDropdown(this.element,
			'Reuse existing compiler tab',
			use(this.properties.reuseCompilerTab)?.let(it => it ? 'Yes' : 'No').value ?? USE_DEFAULT,
			['Yes', 'No', USE_DEFAULT],
			(value) => {
				switch (value) {
					case 'Yes': return this.properties.reuseCompilerTab = true;
					case 'No': return this.properties.reuseCompilerTab = false;
					case USE_DEFAULT: return this.properties.reuseCompilerTab = undefined;
				}
			}
		);
		
		this.reuseCompileTabDropdown.classList.add('singleline');

		Preferences.events.on('setDefaultRuntimeChannel', this.onChangeDefaultRuntimeChannel);
		this.properties.events.on('changeBuildConfig', this.onChangeBuildConfig);
		this.properties.events.on('changeRuntimeChannel', this.onChangeRuntimeChannel);

	}

	/**
	 * Clean up our event listens.
	 */
	destroy() {
		Preferences.events.off('setDefaultRuntimeChannel', this.onChangeDefaultRuntimeChannel);
		this.properties.events.off('changeBuildConfig', this.onChangeBuildConfig);
		this.properties.events.off('changeRuntimeChannel', this.onChangeRuntimeChannel);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['changeBuildConfig']} event
	 */
	onChangeBuildConfig = ({ current }) => {
		UIDropdownSetValue(this.buildConfigDropdown, current);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['changeRuntimeChannel']} channel
	 */
	onChangeRuntimeChannel = ({ channel, isNetChange }) => {

		this.updateChannel(channel);

		if (isNetChange) {
			this.updateRuntimeVersionList(channel ?? Preferences.defaultRuntimeChannel);
		}

	};

	/**
	 * @private
	 * @param {GMChannelType} channel 
	 */
	onChangeDefaultRuntimeChannel = (channel) => {
		if (UIDropdownGetValue(this.zeusReleaseChannelDropdown) === USE_DEFAULT) {
			this.updateRuntimeVersionList(channel);
		}
	};

	/**
	 * @private
	 * @param {GMChannelType|undefined} channel
	 */
	updateChannel(channel) {
		UIDropdownSetValue(this.zeusReleaseChannelDropdown, channel ?? USE_DEFAULT);
	}

	/**
	 * @private
	 * @param {GMChannelType} channel 
	 */
	updateRuntimeVersionList(channel) {
		UIDropdownMutate(this.runtimeVersionDropdown,
			[...preferencesMenu.runtime_version_strings_get_for_type(channel), USE_DEFAULT],
			this.properties.runtimeVersion ?? USE_DEFAULT
		);
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

		this.group?.remove();

	}

}
