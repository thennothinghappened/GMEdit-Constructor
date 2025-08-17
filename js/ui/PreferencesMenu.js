/**
 * Controller for the Preferences configuration on the menu.
 */

import * as ui from '../ui/ui-wrappers.js';
import { GM_RELEASE_CHANNELS, Preferences, GMS2_RUNTIME_TYPES } from '../preferences/Preferences.js';
import { use } from '../utils/scope-extensions/use.js';
import { Dropdown } from './components/Dropdown.js';
import { mapToOption, Some } from '../utils/Option.js';
import { Input as TextField } from './components/TextField.js';
import { docString } from '../utils/StringUtils.js';
import { Checkbox } from './components/Checkbox.js';

/**
 * @implements {Destroyable}
 */
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
	 * @type {{ [key in GM.ReleaseChannel]: { userDropdown: UI.Dropdown<GM.User>, runtimesDirInput: TextField, installDataDirInput: TextField } }}
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

			this.checkForUpdatesCheckbox = new Checkbox('Automatically check for updates',
					this.preferences.checkForUpdates,
					(value) => { this.preferences.checkForUpdates = value }
				)
				.tooltip('Whether to check for updates on startup via GitHub.')
				.appendTo(section);

			this.saveOnRunCheckbox = new Checkbox('Auto-save open files when running tasks',
					this.preferences.saveOnRun,
					(value) => { this.preferences.saveOnRun = value }
				)
				.tooltip('Whether to automatically save when you run a project task.')
				.appendTo(section);

			this.reuseOutputTabCheckbox = new Checkbox('Reuse existing compiler tab',
					this.preferences.reuseOutputTab,
					(value) => { this.preferences.reuseOutputTab = value }
				)
				.tooltip(docString(`
					Whether to reuse an existing compiler output tab for re-running. This may be
					useful to disable if you intentionally want to run multiple at a time, e.g. for
					multiplayer.
				`))
				.appendTo(section);

			this.showTooltipHintsCheckbox = new Checkbox('Show hints for options with help text',
					this.preferences.showTooltipHints,
					(value) => { this.preferences.showTooltipHints = value }
				)
				.tooltip(docString(`
					Whether to show visual indicators beside options on this page that have tooltip
					text you can view by hovering over them.
				`))
				.appendTo(section);
			
			this.outputPositionDropdown = new Dropdown('Output log position',
					Some(this.preferences.outputPosition),
					(value) => { this.preferences.outputPosition = value },
					/** @type {ReadonlyArray<UI.Dropdown.Entry<TPreferences.OutputPosition>>} */ ([
						{
							label: 'Editor Tab',
							value: 'fullTab'
						},
						{
							label: 'Bottom Pane',
							value: 'bottomPane'
						},
						{
							label: 'Right Pane',
							value: 'rightPane'
						}
					])
				)
				.tooltip(docString(`
					Where output logs and errors should be displayed when compiling and running
					projects.
				`))
				.singleline()
				.appendTo(section);
		
		}).also(it => this.element.appendChild(it));

		use(document.createElement('section')).also(section => {

			section.appendChild(ui.h3('Build Settings'));

			this.runtimeBuildTypeDropdown = new Dropdown('Runtime Type',
					Some(this.preferences.runtimeBuildType),
					(value) => { this.preferences.runtimeBuildType = value },
					GMS2_RUNTIME_TYPES
				)
				.singleline()
				.tooltip('The type of runtime to use.')
				.appendTo(section);
			
		}).also(it => this.element.appendChild(it));

		use(document.createElement('section')).also(section => {

			section.appendChild(ui.h3('Paths'));

			this.globalBuildsPathInput = new TextField('Global Builds Path',
					this.preferences.globalBuildPath,
					(value) => { this.preferences.globalBuildPath = value }
				)
				.tooltip(docString(`
					Path to a central builds directory, which Constructor manages for you. Stops
					your project's directory being clogged by build files.
				`))
				.appendTo(section);

			this.useGlobalBuildPathCheckbox = new Checkbox('Use the global builds directory',
					this.preferences.useGlobalBuildPath,
					(value) => { this.preferences.useGlobalBuildPath = value }
				)
				.tooltip(docString(`
					Whether to use the global builds directory, or instead to place build files in
					the project's own directory.
				`))
				.appendTo(section);

			for (const channel of GM_RELEASE_CHANNELS) {

				const widgets = this.channelWidgets[channel];
				const group = ui.group(section, channel);

				widgets.runtimesDirInput = new TextField('Runtimes Directory',
					this.preferences.getRuntimeSearchPath(channel),
					async (path) => {
						await this.preferences.setRuntimeSearchPath(channel, path)
					}
				).appendTo(group);

				widgets.installDataDirInput = new TextField('Installation Data Directory',
					this.preferences.getUserSearchPath(channel),
					async (path) => {
						await this.preferences.setUserSearchPath(channel, path);
					}
				).appendTo(group);

				const users = this.preferences.getUsers(channel);
		
				widgets.userDropdown = new Dropdown('User',
						mapToOption(this.preferences.getDefaultUser(channel)),
						(value) => this.preferences.setDefaultUser(channel, value),
						users?.map(user => ({ label: user.name, value: user })) ?? [],
						(a, b) => a.fullPath === b.fullPath
					)
					.visible(users !== undefined)
					.appendTo(group);

				// Presumably not-installed groups can start collapsed, since the user probably
				// doesn't care about them unless they specifically want to set them up.
				const runtimes = this.preferences.getRuntimes(channel);

				widgets.runtimesDirInput.hasError(runtimes === undefined);
				widgets.installDataDirInput.hasError(users === undefined);

				if ((runtimes === undefined) && (users === undefined)) {
					group.classList.add('collapsed');
				}
		
			}	
		
		}).also(it => this.element.appendChild(it));

		this.onSetShowTooltipHints({ showTooltipHints: this.preferences.showTooltipHints });

		/** @private */
		this.preferencesEventGroup = this.preferences.events.createGroup({
			setCheckForUpdates: this.onSetCheckForUpdates,
			setSaveOnRun: this.onSetSaveOnRun,
			setReuseOutputTab: this.onSetReuseOutputTab,
			setShowTooltipHints: this.onSetShowTooltipHints,
			setOutputPosition: this.onSetOutputPosition,
			setUseGlobalBuildPath: this.onSetUseGlobalBuildPath,
			setGlobalBuildPath: this.onSetGlobalBuildPath,
			userListChanged: this.onUserListChanged,
			runtimeListChanged: this.onRuntimeListChanged
		});

	}

	/**
	 * Clean up this preferences menu instance.
	 */
	destroy() {
		this.preferencesEventGroup.destroy();
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setCheckForUpdates']} event
	 */
	onSetCheckForUpdates = ({ checkForUpdates }) => {
		this.checkForUpdatesCheckbox.value = checkForUpdates;
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setSaveOnRun']} event
	 */
	onSetSaveOnRun = ({ saveOnRun }) => {
		this.saveOnRunCheckbox.value = saveOnRun;
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setReuseOutputTab']} event
	 */
	onSetReuseOutputTab = ({ reuseOutputTab }) => {
		this.reuseOutputTabCheckbox.value = reuseOutputTab;
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setShowTooltipHints']} event
	 */
	onSetShowTooltipHints = ({ showTooltipHints }) => {
		this.showTooltipHintsCheckbox.value = showTooltipHints;
		this.element.classList.toggle('gm-constructor-show-tooltip-indicators', showTooltipHints);
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setOutputPosition']} outputPosition
	 */
	onSetOutputPosition = (outputPosition) => {
		this.outputPositionDropdown.setSelectedOption(outputPosition);
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setUseGlobalBuildPath']} event
	 */
	onSetUseGlobalBuildPath = ({ useGlobalBuildPath }) => {
		this.useGlobalBuildPathCheckbox.value = useGlobalBuildPath;
	}

	/**
	 * @private
	 * @param {TPreferences.PreferencesEventMap['setGlobalBuildPath']} event
	 */
	onSetGlobalBuildPath = ({ globalBuildPath }) => {
		this.globalBuildsPathInput.value = globalBuildPath;
	}

	/**
	 * Update the user dropdown when the list of users change for that channel.
	 * 
	 * @private
	 * @param {TPreferences.PreferencesEventMap['userListChanged']} event
	 */
	onUserListChanged = ({ channel, usersInfo }) => {
		
		const { userDropdown, installDataDirInput } = this.channelWidgets[channel];

		if (usersInfo === undefined) {
			userDropdown.visible(false);
			installDataDirInput.hasError(true);

			return;
		}

		userDropdown.setOptions(usersInfo.users.map(user => ({
			label: user.name,
			value: user
		})), usersInfo.defaultUser);

		userDropdown.visible(true);
		installDataDirInput.hasError(false);

	}

	/**
	 * Update whether to show an error for the runtimes path.
	 * 
	 * @private
	 * @param {TPreferences.PreferencesEventMap['runtimeListChanged']} event
	 */
	onRuntimeListChanged = ({ channel, runtimesInfo }) => {
		const { runtimesDirInput } = this.channelWidgets[channel];
		runtimesDirInput.hasError(runtimesInfo === undefined);
	}

}
