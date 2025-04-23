import { use } from '../../utils/scope-extensions/use.js';
import { GM_RELEASE_CHANNELS, Preferences, GMS2_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { project_config_tree_flatten } from '../../utils/project.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import { Dropdown } from '../components/Dropdown.js';
import { None, Some } from '../../utils/Option.js';
import { GMRuntimeVersion } from '../../compiler/GMVersion.js';

/**
 * Used for runtime/user select dropdowns, to default to the global settings.
 * Corresponds to `undefined` in the actual preferences files.
 * 
 * @type {UI.Dropdown.NormalizedEntry<undefined>}
 */
const USE_DEFAULT = {
	label: 'Use Default',
	value: undefined
};

/**
 * @type {UI.Dropdown.NormalizedEntry<undefined>}
 */
const USE_COMPATIBLE_CHANNEL = {
	label: 'Automatic',
	value: undefined
};

/**
 * User interface for managing project-specific properties.
 * 
 * @implements {Destroyable}
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
	 * @type {UI.Dropdown<string>}
	 */
	buildConfigDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GMS2.Platform|undefined>}
	 */
	platformDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GMS2.RuntimeType|undefined>}
	 */
	gms2RuntimeTypeDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GM.ReleaseChannel|undefined>}
	 */
	gms2ReleaseChannelDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GMRuntimeVersion|undefined>}
	 */
	runtimeVersionDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<boolean|undefined>}
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
				(config_name) => { this.properties.buildConfigName = config_name },
				project_config_tree_flatten(this.properties.rootBuildConfig)
			)
			.singleline()
			.appendTo(this.element);

		// ------------------------------------------------------------------------------

		this.platformDropdown = new Dropdown('Runner Platform',
				Some(this.properties.gms2Platform),
				(value) => { this.properties.gms2Platform = value; },
				[
					{ label: 'Current Platform', value: undefined },
					'HTML5',
					'OperaGX',
				]
			)
			.singleline()
			.appendTo(this.element);

		// ------------------------------------------------------------------------------

		this.gms2RuntimeTypeDropdown = new Dropdown('Runtime Type',
				Some(this.properties.runtimeBuildType),
				(value) => { this.properties.runtimeBuildType = value; },
				[USE_DEFAULT, ...GMS2_RUNTIME_TYPES]
			)
			.singleline()
			.appendTo(this.element);

		// ------------------------------------------------------------------------------

		this.gms2ReleaseChannelDropdown = new Dropdown('Runtime Release Channel',
				Some(this.properties.runtimeReleaseChannel),
				(value) => { this.properties.runtimeReleaseChannel = value; },
				[USE_COMPATIBLE_CHANNEL, ...GM_RELEASE_CHANNELS]
			)
			.singleline()
			.appendTo(this.element);

		// ------------------------------------------------------------------------------

		this.runtimeVersionDropdown = new Dropdown('Runtime Version',
				None,
				(value) => { this.properties.runtimeVersion = value; },
				[],
				(a, b) => a.equals(b)
			)
			.singleline()
			.appendTo(this.element);

		this.updateRuntimeVersionList(this.properties.runtimeReleaseChannel);

		// ------------------------------------------------------------------------------
		
		this.reuseOutputTabDropdown = new Dropdown('Reuse existing compiler tab',
				Some(this.properties.reuseOutputTab),
				(value) => { this.properties.reuseOutputTab = value; },
				[
					USE_DEFAULT,
					{ label: 'Yes', value: true },
					{ label: 'No', value: false }
				],
			)
			.singleline()
			.appendTo(this.element);

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
		this.updateRuntimeVersionList(channel);
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
		if (this.properties.runtimeReleaseChannel === channel) {
			this.updateRuntimeVersionList(channel);
		}
	};

	/**
	 * @private
	 * @param {GM.ReleaseChannel|undefined} channel 
	 */
	updateRuntimeVersionList(channel) {

		this.gms2ReleaseChannelDropdown.setSelectedOption(channel);

		if (channel === undefined) {
			
			this.runtimeVersionDropdown.setOptions([{
				label: 'Latest compatible (Pick a release channel to override)',
				value: undefined
			}], undefined);

			this.runtimeVersionDropdown.enable(false);
			return;

		}

		const entries = this.preferences.getRuntimes(channel)?.map(runtime => ({
			label: runtime.version.toString(),
			value: runtime.version
		}));

		if (entries === undefined) {

			this.runtimeVersionDropdown.setOptions([{
				label: 'None installed',
				value: undefined
			}], undefined);

			this.runtimeVersionDropdown.enable(false);
			return;

		}
		
		this.runtimeVersionDropdown.setOptions(
			[
				{
					label: 'Latest compatible',
					value: undefined
				},
				...entries
			],
			this.properties.runtimeVersion
		);

		this.runtimeVersionDropdown.enable(true);

	}

}
