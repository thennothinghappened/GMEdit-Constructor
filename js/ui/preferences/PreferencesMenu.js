/**
 * Controller for the Preferences configuration on the menu.
 */

import { PLUGIN_NAME, PLUGIN_VERSION } from '../../GMConstructor.js';
import * as ui from '../../ui/ui-wrappers.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';
import { use } from '../../utils/scope-extensions/use.js';
import { Dropdown } from '../components/Dropdown.js';
import { mapToOption, Some } from '../../utils/Option.js';

const UIPreferences = $gmedit['ui.Preferences'];

/** @type {string} */
let pluginSettingsQueryString;

/** @type {PreferencesMenu|undefined} */
let singletonInstance = undefined;

/** @type {Components.NormalizedDropdownEntry<undefined>} */
const USE_NEWEST = {
	label: 'Use Newest Installed',
	value: undefined
};

export class PreferencesMenu {

	/**
	 * The root element of the menu.
	 */
	element = document.createElement('div');

	/**
	 * @private
	 * @type {Preferences}
	 */
	preferences;

	/**
	 * @private
	 * @type {{ [key in GMChannelType]: { versionDropdown: Components.IDropdown<Zeus.RuntimeInfo|undefined>, userDropdown: Components.IDropdown<UserInfo> } }}
	 */
	channelWidgets = {
		// @ts-expect-error Filled in during the constructor.
		Stable: {},
		// @ts-expect-error Filled in during the constructor.
		Beta: {},
		// @ts-expect-error Filled in during the constructor.
		LTS: {},
	};

	/**
	 * @param {Preferences} preferences The preferences instance to bind to.
	 */
	constructor(preferences) {

		this.preferences = preferences;

		use(document.createElement('section')).also(section => {

			section.appendChild(ui.h3('Plugin Behaviour'));

			UIPreferences.addCheckbox(
				section,
				'Automatically check for updates',
				this.preferences.checkForUpdates,
				(update_check) => (this.preferences.checkForUpdates = update_check)
			).title = 'Whether to check for updates on startup via GitHub.';
		
			UIPreferences.addCheckbox(
				section,
				'Auto-save open files when running tasks',
				this.preferences.saveOnRun,
				(saveOnRun) => (this.preferences.saveOnRun = saveOnRun)
			).title = 'Whether to automatically save when you run a project task.';
		
			UIPreferences.addCheckbox(
				section,
				'Reuse existing compiler tab',
				this.preferences.saveOnRun,
				(reuseOutputTab) => { this.preferences.reuseOutputTab = reuseOutputTab; }
			).title = 'Whether to reuse an existing compiler output tab for re-running. This may be useful to disable if you intentionally want to run multiple at a time, e.g. for multiplayer.';

		}).also(it => this.element.appendChild(it));

		use(document.createElement('section')).also(section => {

			section.appendChild(ui.h3('Build Settings'));

			use(new Dropdown('Runtime Type',
				Some(this.preferences.runtimeBuildType),
				(runtimeBuildType) => { this.preferences.runtimeBuildType = runtimeBuildType; },
				ZEUS_RUNTIME_TYPES
			)).let(it => it.element).also(element => {
				element.classList.add('singleline');
				element.title = 'The type of runtime to use.';
				section.appendChild(element);
			});
		
			this.runtimeReleaseChannelDropdown = use(new Dropdown('Runtime Release Channel',
				Some(this.preferences.defaultRuntimeChannel),
				(defaultRuntimeChannel) => { this.preferences.defaultRuntimeChannel = defaultRuntimeChannel; },
				GM_CHANNEL_TYPES
			)).also(it => {
				it.element.classList.add('singleline');
				it.element.title = 'The GameMaker update channel from which to pick the runtime version from.';
				section.appendChild(it.element);
			}).value;
			
		}).also(it => this.element.appendChild(it));

		use(document.createElement('section')).also(section => {

			section.appendChild(ui.h3('Paths'));

			UIPreferences.addInput(section, 'Global Builds Path',
				this.preferences.globalBuildPath,
				(globalBuildPath) => { this.preferences.globalBuildPath = globalBuildPath; }
			).title = 'Path to a central builds directory, which Constructor manages for you. Stops your project\'s directory being clogged by build files.';
		
			UIPreferences.addCheckbox(section, 'Use the global builds directory',
				this.preferences.useGlobalBuildPath,
				(useGlobalBuildPath) => { this.preferences.useGlobalBuildPath = useGlobalBuildPath; }
			).title = 'Whether to use the global builds directory, or instead to place build files in the project\'s own directory.';

			for (const channel of GM_CHANNEL_TYPES) {

				const widgets = this.channelWidgets[channel];
				const group = ui.group(section, channel);

				UIPreferences.addInput(group, 'Runtimes Directory',
					this.preferences.getRuntimeSearchPath(channel),
					(path) => {
						
						// Workaround for being called twice for some reason?
						if (path === this.preferences.getRuntimeSearchPath(channel)) {
							return;
						}
						
						// FIXME: UI can spam call this and cause an invalid state!
						this.preferences.setRuntimeSearchPath(channel, path);

					}
				);

				const runtimes = this.preferences.getInstalledRuntimeVersions(channel);
		
				widgets.versionDropdown = new Dropdown('Version',
					Some(this.preferences.getPreferredRuntimeVersion(channel)),
					(runtime) => this.preferences.setPreferredRuntimeVersion(channel, runtime?.version),
					[
						USE_NEWEST,
						...runtimes?.map(runtime => ({
							label: runtime.version.toString(),
							value: runtime
						})) ?? []
					],
					(a, b) => a.version.equals(b.version)
				);

				if (runtimes === undefined) {
					widgets.versionDropdown.element.hidden = true;
				}

				group.appendChild(widgets.versionDropdown.element);
		
				UIPreferences.addInput(group, 'Installation Data Directory',
					this.preferences.getUserSearchPath(channel),
					(path) => {

						// Workaround for being called twice for some reason?
						if (path === this.preferences.getUserSearchPath(channel)) {
							return;
						}
		
						// FIXME: UI can spam call this and cause an invalid state!
						this.preferences.setUserSearchPath(channel, path);

					}
				);

				const users = this.preferences.getUsers(channel);
		
				widgets.userDropdown = new Dropdown('User',
					mapToOption(this.preferences.getUser(channel)),
					(user) => this.preferences.setUser(channel, user.name),
					users?.map(user => ({ label: user.name, value: user })) ?? [],
					(a, b) => a.name === b.name
				);

				if (users === undefined) {
					widgets.userDropdown.element.hidden = true;
				}

				group.appendChild(widgets.userDropdown.element);

				// Presumably not-installed groups can start collapsed, since the user probably
				// doesn't care about them unless they specifically want to set them up.
				if ((runtimes === undefined) && (users === undefined)) {
					group.classList.add('collapsed');
				}
		
			}	
		
		}).also(it => this.element.appendChild(it));

		this.preferences.events.on('setDefaultRuntimeChannel', this.onSetDefaultRuntimeChannel);
		this.preferences.events.on('setCheckForUpdates', this.onSetCheckForUpdates);
		this.preferences.events.on('setSaveOnRun', this.onSetSaveOnRun);
		this.preferences.events.on('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.on('setUseGlobalBuildPath', this.onSetUseGlobalBuildPath);
		this.preferences.events.on('setGlobalBuildPath', this.onSetGlobalBuildPath);
		this.preferences.events.on('runtimeListChanged', this.onRuntimeListChanged);
		this.preferences.events.on('userListChanged', this.onUserListChanged);

	}

	/**
	 * Clean up this preferences menu instance.
	 */
	destroy() {
		this.preferences.events.off('setDefaultRuntimeChannel', this.onSetDefaultRuntimeChannel);
		this.preferences.events.off('setCheckForUpdates', this.onSetCheckForUpdates);
		this.preferences.events.off('setSaveOnRun', this.onSetSaveOnRun);
		this.preferences.events.off('setReuseOutputTab', this.onSetReuseOutputTab);
		this.preferences.events.off('setUseGlobalBuildPath', this.onSetUseGlobalBuildPath);
		this.preferences.events.off('setGlobalBuildPath', this.onSetGlobalBuildPath);
		this.preferences.events.off('runtimeListChanged', this.onRuntimeListChanged);
		this.preferences.events.off('userListChanged', this.onUserListChanged);
	}

	/**
	 * Update the default runtime channel selection upon modification.
	 * 
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setDefaultRuntimeChannel']} channel
	 */
	onSetDefaultRuntimeChannel = (channel) => {
		this.runtimeReleaseChannelDropdown.setSelectedOption(channel);
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setCheckForUpdates']} event
	 */
	onSetCheckForUpdates = ({ checkForUpdates }) => {
		console.warn('TODO: implement onSetCheckForUpdates');
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setSaveOnRun']} event
	 */
	onSetSaveOnRun = ({ saveOnRun }) => {
		console.warn('TODO: implement onSetSaveOnRun');
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setReuseOutputTab']} event
	 */
	onSetReuseOutputTab = ({ reuseOutputTab }) => {
		console.warn('TODO: implement onSetReuseOutputTab');
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setUseGlobalBuildPath']} event
	 */
	onSetUseGlobalBuildPath = ({ useGlobalBuildPath }) => {
		console.warn('TODO: implement onSetUseGlobalBuildPath');
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setGlobalBuildPath']} event
	 */
	onSetGlobalBuildPath = ({ globalBuildPath }) => {
		console.warn('TODO: implement onSetGlobalBuildPath');
	}

	/**
	 * Update the runtime version dropdown when the list of installed versions change for that
	 * channel.
	 * 
	 * @private
	 * @param {TPreferences.PreferencesEventMap['runtimeListChanged']} event
	 */
	onRuntimeListChanged = ({ channel, runtimesInfo }) => {
		
		const versionDropdown = this.channelWidgets[channel].versionDropdown;

		if (runtimesInfo === undefined) {
			versionDropdown.element.hidden = true;
			return;
		}

		versionDropdown.setOptions([
			USE_NEWEST,
			...runtimesInfo.runtimes.map(runtime => ({
				label: runtime.version.toString(),
				value: runtime
			}))
		], runtimesInfo.preferredRuntime);

		versionDropdown.element.hidden = false;

	}

	/**
	 * Update the user dropdown when the list of users change for that channel.
	 * 
	 * @private
	 * @param {TPreferences.PreferencesEventMap['userListChanged']} event
	 */
	onUserListChanged = ({ channel, usersInfo }) => {
		
		const userDropdown = this.channelWidgets[channel].userDropdown;

		if (usersInfo === undefined) {
			userDropdown.element.hidden = true;
			return;
		}

		userDropdown.setOptions(usersInfo.users.map(user => ({
			label: user.name,
			value: user
		})), usersInfo.defaultUser);

		userDropdown.element.hidden = false;

	}

	/**
	 * @private
	 * @type {Preferences}
	 */
	static preferences;

	/**
	 * Setup the preferences menu callback.
	 * @param {Preferences} preferences 
	 */
	static __setup__(preferences) {

		this.preferences = preferences;
		pluginSettingsQueryString = `.plugin-settings[for^="${PLUGIN_NAME}"]`;

		if (UIPreferences.menuMain != undefined) {
			this.onPreferencesBuilt({ target: UIPreferences.menuMain });
		}

		GMEdit.on('preferencesBuilt', this.onPreferencesBuilt);
		
	}

	/**
	 * Deregister callback for setting up menu.
	 */
	static __cleanup__() {
		GMEdit.off('preferencesBuilt', this.onPreferencesBuilt);
	}

	/**
	 * Callback for setting up our preferences menu when the user opens prefs.
	 * @param {GMEdit.PluginEventMap['preferencesBuilt']} event
	 */
	static onPreferencesBuilt = ({ target }) => {

		const group = target.querySelector(pluginSettingsQueryString);

		if (group instanceof HTMLDivElement) {

			singletonInstance ??= new PreferencesMenu(this.preferences);

			group.appendChild(singletonInstance.element);
			UIPreferences.addText(group, `Version: ${PLUGIN_VERSION}`);

		}

	};

}
