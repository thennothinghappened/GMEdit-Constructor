import { use } from '../../utils/scope-extensions/use.js';
import { UIDropdownGetValue, UIDropdownMutate, UIDropdownSetValue } from '../../utils/gmedit/UIPreferencesUtils.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { project_config_tree_flatten } from '../../utils/project.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import * as preferencesMenu from './PreferencesMenu.js';

const UIPreferences = $gmedit['ui.Preferences'];

/**
 * User interface for managing project-specific properties.
 */
export class ProjectPropertiesMenu {

	/**
	 * @type {(DocumentFragment & { buildConfigDropdown?: GMEdit.UIDropdown<string>, runtimeVersionDropdown?: GMEdit.UIDropdown<string> })}
	 */
	element = new DocumentFragment();

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

	constructor() {

		this.element.appendChild(this.subtitle);

		this.buildConfigDropdown = UIPreferences.addDropdown(this.element,
			'Build Configuration',
			ProjectProperties.buildConfigName,
			project_config_tree_flatten(ProjectProperties.rootBuildConfig),
			(config_name) => ProjectProperties.buildConfigName = config_name
		);

		this.buildConfigDropdown.classList.add('singleline');

		this.zeusPlatformDropdown = UIPreferences.addDropdown(this.element,
			'Runner Platform',
			ProjectProperties.zeusPlatform ?? 'Current Platform',
			['Current Platform', 'HTML5', 'OperaGX'],
			(value) => ProjectProperties.zeusPlatform = (value === 'Current Platform') ? undefined : value
		)
		
		this.zeusPlatformDropdown.classList.add('singleline');

		this.zeusRuntimeTypeDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Type',
			ProjectProperties.runtimeBuildType ?? USE_DEFAULT,
			[...ZEUS_RUNTIME_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeBuildType = default_undefined(value)
		);
		
		this.zeusRuntimeTypeDropdown.classList.add('singleline');

		this.zeusReleaseChannelDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Release Channel',
			ProjectProperties.runtimeChannelType ?? USE_DEFAULT,
			[...GM_CHANNEL_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeChannelType = default_undefined(value)
		);
		
		this.zeusReleaseChannelDropdown.classList.add('singleline');
		
		this.runtimeVersionDropdown = UIPreferences.addDropdown(this.element,
			'Runtime Version',
			ProjectProperties.runtimeVersion ?? USE_DEFAULT,
			[...preferencesMenu.runtime_version_strings_get_for_type(ProjectProperties.runtimeChannelTypeOrDef), USE_DEFAULT],
			(value) => ProjectProperties.runtimeVersion = default_undefined(value)
		);
		
		this.runtimeVersionDropdown.classList.add('singleline');
		
		this.reuseCompileTabDropdown = UIPreferences.addDropdown(this.element,
			'Reuse existing compiler tab',
			USE_DEFAULT,
			['Yes', 'No', USE_DEFAULT],
			(value) => {
				switch (value) {
					case 'Yes': return ProjectProperties.reuseCompilerTab = true;
					case 'No': return ProjectProperties.reuseCompilerTab = false;
					case USE_DEFAULT: return ProjectProperties.reuseCompilerTab = undefined;
				}
			}
		);
		
		this.reuseCompileTabDropdown.classList.add('singleline');

	}

	/**
	 * Load the properties for the new project.
	 * 
	 * @param {GMEdit.Project} project
	 */
	onOpenProject = (project) => {
		
		this.subtitle.textContent = `Configure behaviour for ${project.displayName}.`;

		UIDropdownMutate(this.buildConfigDropdown,
			project_config_tree_flatten(ProjectProperties.rootBuildConfig),
			ProjectProperties.buildConfigName
		);

		UIDropdownSetValue(this.zeusPlatformDropdown,
			ProjectProperties.zeusPlatform ?? 'Current Platform'
		);

		UIDropdownSetValue(this.zeusRuntimeTypeDropdown,
			ProjectProperties.runtimeBuildType ?? USE_DEFAULT,
		);

		const previousChannelType = UIDropdownGetValue(this.zeusReleaseChannelDropdown);
		
		UIDropdownSetValue(this.zeusReleaseChannelDropdown,
			ProjectProperties.runtimeChannelType ?? USE_DEFAULT
		);
		
		if (default_undefined(previousChannelType) !== ProjectProperties.runtimeChannelType) {
			this.updateRuntimeVersionList(ProjectProperties.runtimeChannelTypeOrDef);
		}
		
		UIDropdownSetValue(this.reuseCompileTabDropdown,
			use(ProjectProperties.reuseCompilerTab)
				?.let(it => it ? 'Yes' : 'No')
				.value ?? USE_DEFAULT
		);

		Preferences.events.on('setDefaultRuntimeChannel', this.onChangeDefaultRuntimeChannel);
		ProjectProperties.events.on('changeBuildConfig', this.onChangeBuildConfig);
		ProjectProperties.events.on('changeRuntimeChannel', this.onChangeRuntimeChannel);

	};

	/**
	 * Clean up our event listens.
	 */
	onCloseProject = () => {
		Preferences.events.off('setDefaultRuntimeChannel', this.onChangeDefaultRuntimeChannel);
		ProjectProperties.events.off('changeBuildConfig', this.onChangeBuildConfig);
		ProjectProperties.events.off('changeRuntimeChannel', this.onChangeRuntimeChannel);
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
	onChangeRuntimeChannel = ({ previous, channel, isNetChange }) => {

		this.updateChannel(channel);

		if (isNetChange) {
			console.info(`Changed from ${previous} to ${channel}`);
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

		console.info(`Updating version list to channel ${channel}`);

		UIDropdownMutate(this.runtimeVersionDropdown,
			[...preferencesMenu.runtime_version_strings_get_for_type(channel), USE_DEFAULT],
			ProjectProperties.runtimeVersion ?? USE_DEFAULT
		);
	}

	/**
	 * Clean up this menu's event listeners.
	 */
	destroy() {
		this.onCloseProject();
	}

}

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
