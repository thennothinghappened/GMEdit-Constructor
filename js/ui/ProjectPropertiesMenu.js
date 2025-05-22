import { GM_RELEASE_CHANNELS, Preferences, GMS2_RUNTIME_TYPES } from '../preferences/Preferences.js';
import { project_config_tree_flatten } from '../utils/project.js';
import { ProjectProperties } from '../preferences/ProjectProperties.js';
import { Dropdown } from './components/Dropdown.js';
import { None, Some } from '../utils/Option.js';
import { GMRuntimeVersion } from '../compiler/GMVersion.js';
import * as ui from './ui-wrappers.js';
import { use } from '../utils/scope-extensions/use.js';
import { docString } from '../utils/StringUtils.js';
import { HOST_PLATFORM } from '../compiler/igor-paths.js';

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
	 * @type {UI.Dropdown<string>}
	 */
	buildConfigDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GM.SupportedPlatform|undefined>}
	 */
	platformDropdown;

	/**
	 * @private
	 * @type {UI.Dropdown<GMS2.RemoteDevice|undefined>}
	 */
	deviceDropdown;

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

		this.element.appendChild(ui.em(
			`Configure behaviour for ${properties.project.displayName}.`
		));

		// ------------------------------------------------------------------------------

		this.buildConfigDropdown = new Dropdown('Build Configuration',
				Some(this.properties.buildConfigName),
				(config_name) => { this.properties.buildConfigName = config_name },
				project_config_tree_flatten(this.properties.rootBuildConfig)
			)
			.singleline()
			.appendTo(this.element);

		// ------------------------------------------------------------------------------

		this.platformDropdown = new Dropdown('Platform',
				Some(this.properties.platform),
				(value) => { this.properties.platform = value; },
				[
					{ label: 'Current Platform', value: undefined },
					...[
						'HTML5',
						'OperaGX',
						'Mac',
						'Linux',
						'Android'
					].filter(entry => entry !== HOST_PLATFORM)
				]
			)
			.singleline()
			.appendTo(this.element);

		this.deviceDropdown = 
			/** @type {Dropdown<GMS2.RemoteDevice|undefined>} */ 
			(new Dropdown('Remote Device',
				None,
				(value) => { this.properties.device = value },
				[],
				(a, b) => (a.channel === b.channel) && (a.name === b.name)
			))
			.singleline()
			.appendTo(this.element);

		this.updatePlatformDeviceCombo();

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
			.tooltip(docString(`
				
				Project Format: ${properties.projectVersion}.

				Constructor uses the IDE version written in the project's YYP file to determine
				which runtimes are compatible with it. This value is sometimes wrong if you
				import a project into a new GameMaker version and don't do anything that would
				modify the YYP (create/remove/rename/move an asset or build config.)

				If the detected version is incorrect, open the GameMaker IDE and perform one of
				those actions to update it, or you can override Constructor's automatically chosen
				runtime by selecting a runtime channel and runtime version using these options.

			`))
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

		this.onSetShowTooltipHints({ showTooltipHints: this.preferences.showTooltipHints });

		this.properties.events.on('setBuildConfig', this.onSetBuildConfig);
		this.properties.events.on('setRuntimeChannel', this.onSetRuntimeChannel);
		this.properties.events.on('setPlatform', this.onSetPlatform);
		this.properties.events.on('setDevice', this.onSetDevice);
		this.properties.events.on('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.on('setShowTooltipHints', this.onSetShowTooltipHints);
		this.preferences.events.on('runtimeListChanged', this.onRuntimeListChanged);

	}

	/**
	 * Clean up our event listens.
	 */
	destroy() {
		this.properties.events.off('setBuildConfig', this.onSetBuildConfig);
		this.properties.events.off('setRuntimeChannel', this.onSetRuntimeChannel);
		this.properties.events.off('setPlatform', this.onSetPlatform);
		this.properties.events.off('setDevice', this.onSetDevice);
		this.properties.events.off('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.off('setShowTooltipHints', this.onSetShowTooltipHints);
		this.preferences.events.off('runtimeListChanged', this.onRuntimeListChanged);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setBuildConfig']} event
	 */
	onSetBuildConfig = ({ current }) => {
		this.buildConfigDropdown.setSelectedOption(current);
	};

	/**
	 * @private
	 * @param {TPreferences.ProjectPropertiesEventMap['setRuntimeChannel']} event
	 */
	onSetRuntimeChannel = ({ channel }) => {
		this.updateRuntimeVersionList(channel);
	};

	/**
	 * @private
	 */
	onSetPlatform = () => {
		this.updatePlatformDeviceCombo();
	};

	/**
	 * @private
	 */
	onSetDevice = () => {
		this.updatePlatformDeviceCombo();
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
	 * @param {TPreferences.PreferencesEventMap['setShowTooltipHints']} event
	 */
	onSetShowTooltipHints = ({ showTooltipHints }) => {
		this.element.classList.toggle('gm-constructor-show-tooltip-indicators', showTooltipHints);
	}

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
				label: 'Pick a release channel to override',
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

	/**
	 * @private
	 */
	updatePlatformDeviceCombo() {

		/** 
		 * Platforms which do not support remote devices, so we shouldn't bother showing the remote
		 * device dropdown for them.
		 * 
		 * @type {GM.SupportedPlatform[]} 
		 */
		const NON_REMOTE_PLATFORMS = ['OperaGX', 'HTML5', 'Windows'];

		const platform = this.properties.platform;
		this.platformDropdown.setSelectedOption(platform);

		if (platform === undefined || NON_REMOTE_PLATFORMS.includes(platform)) {
			this.deviceDropdown.visible(false);
			return;
		}

		/** @type {UI.Dropdown.NormalizedEntry<GMS2.RemoteDevice>[]} */
		const deviceDropdownEntries = this.preferences.getRemoteDevices(platform).map(it => ({
			label: `${it.channel} / ${it.name}`,
			value: it
		}));

		if (deviceDropdownEntries.length === 0) {
			this.deviceDropdown
				.enable(false)
				.visible(true)
				.setOptions([{ label: 'No devices found' }], undefined);
				
			return;
		}

		this.deviceDropdown
			.enable(true)
			.visible(true)
			.setOptions(deviceDropdownEntries, this.properties.device);

	}

}
