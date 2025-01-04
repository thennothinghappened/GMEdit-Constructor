
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../../utils/project.js';
import { UIDropdownGetSelect, UIDropdownGetValue, UIDropdownMutate } from '../../../utils/ui.js';
import { ConstructorTab, ConstructorTabFileKind } from '../ConstructorTab.js';
import { ProjectProperties } from '../../../preferences/ProjectProperties.js';
import * as ui from '../../ui-wrappers.js';
import * as preferencesMenu from '../../PreferencesMenu.js';
import { plugin_name, plugin_version } from '../../../GMConstructor.js';
import { use } from '../../../utils/scope-extensions/use.js';
import { GM_CHANNEL_TYPES, Preferences, VALID_RUNNER_TYPES } from '../../../preferences/Preferences.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];
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
 * File type for the control panel.
 */
class ControlPanelFileKind extends ConstructorTabFileKind {

	static inst = new ControlPanelFileKind();

	constructor() {
		super();
		this.checkSelfForChanges = false;
	}

	/** 
	 * @type {GMEdit.FileKind['init']} 
	 */
	init(file) {
		file.editor = new ControlPanelTab(file);
	}

}

/**
 * Main 'control panel' for Constructor to make it a nicer experience to work with!
 */
export class ControlPanelTab extends ConstructorTab {

	static tabName = 'GMEdit-Constructor Control Panel';

	/** @type {ControlPanel.MessageContainer[]} */
	static messages = [];

	/**
	 * @private
	 * @type {(UIGroup & { buildConfigDropdown?: GMEdit.UIDropdown<string>, runtimeVersionDropdown?: GMEdit.UIDropdown<string> })}
	 */
	projectSettings;

	/**
	 * @param {GMEdit.GmlFile} file
	 */
	constructor(file) {
		
		super(file);

		this.element.classList.add('gm-constructor-control-panel', 'popout-window');

		this.element.appendChild(ui.h1(ControlPanelTab.tabName));
		this.element.appendChild(ui.p(`Version: ${plugin_version}`));

		this.problems = ui.group(this.element, 'Problems', [ui.text_button('Dismiss All', ControlPanelTab.dismissAll)]);
		this.problems.classList.add('gm-constructor-control-panel-errors');
		this.problems.hidden = true;

		this.projectSettings = ui.group(this.element, 'Project Settings');
		this.projectSettings.hidden = true;

		this.globalSettings = ui.group(this.element, 'Global Settings');

		ControlPanelTab.messages.forEach(this.#showMessage);
		
		if (Preferences.ready) {
			this.globalSettingsSetup();
		}

		if (project_is_open()) {
			this.onOpenProject();
		}

		GMEdit.on('projectOpen', this.onOpenProject);
		GMEdit.on('projectClose', this.onCloseProject);

	}

	/**
	 * Show the user an error in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	static showError = (title, err) => {
		return this.#appendMessage({ severity: 'error', title, err });
	}

	/**
	 * Show the user a warning in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	static showWarning = (title, err) => {
		return this.#appendMessage({ severity: 'warning', title, err });
	}

	/**
	 * Show the user a debug message in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	static showDebug = (title, err) => {
		return this.#appendMessage({ severity: 'debug', title, err });
	}

	/**
	 * Show the user an error in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	showError = (title, err) => {
		return ControlPanelTab.showError(title, err);
	}

	/**
	 * Show the user a warning in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	showWarning = (title, err) => {
		return ControlPanelTab.showWarning(title, err);
	}

	/**
	 * Show the user a debug message in the UI.
	 * @param {string} title
	 * @param {IErr} err
	 */
	showDebug = (title, err) => {
		return ControlPanelTab.showDebug(title, err);
	}

	/**
	 * Show the user a message in the UI.
	 * @param {ControlPanel.MessageContainer} message
	 */
	static #appendMessage = (message) => {

		/** 
		 * @type { {[key in ControlPanel.MessageSeverity]: (message?: any) => void} }
		 */
		const severity_logs = {
			error: console.error,
			warning: console.warn,
			debug: console.info
		};

		const { severity, title, err } = message;

		this.messages.push(message);

		const log = severity_logs[severity];
		log(`${title} - ${err}`);

		const controlPanel = this.find();

		if (controlPanel !== undefined) {
			controlPanel.#showMessage(message);
		}

		return this;

	}

	/**
	 * Show the user a message in the UI.
	 * @param {ControlPanel.MessageContainer} message
	 */
	#showMessage = (message) => {

		/** 
		 * @type { {[key in ControlPanel.MessageSeverity]: string[]} }
		 */
		const severity_classes = {
			error: ['gm-constructor-error'],
			warning: ['gm-constructor-warning', 'collapsed'],
			debug: ['gm-constructor-debug', 'collapsed']
		};

		const { severity, title, err } = message;
		const css_classes = severity_classes[severity];

		const error = ui.group(this.problems, title, [
			ui.text_button('Dismiss', () => {

				error.remove();

				const index = ControlPanelTab.messages.indexOf(message);

				if (index === -1) {
					return;
				}

				ControlPanelTab.messages.splice(index, 1);

				if (ControlPanelTab.messages.length === 0) {
					this.problems.hidden = true;
				}

			})
		]);

		error.classList.add(...css_classes);
		error.appendChild(ui.p(err.message));

		if (err.solution !== undefined) {
			error.appendChild(ui.h4('Suggested solution'));
			error.appendChild(ui.p(err.solution));
		}
		
		const stacktrace = ui.group(error, 'Stack trace (click to expand)');
		stacktrace.appendChild(ui.pre(err.toString()));
		stacktrace.classList.add('collapsed');

		this.problems.hidden = false;

	}

	/**
	 * Dismiss all errors in the panel.
	 */
	static dismissAll = () => {

		const controlPanel = this.find();

		if (controlPanel !== undefined) {

			for (const element of Array.from(controlPanel.problems.children)) {
				if (element instanceof HTMLFieldSetElement) {
					element.remove();
				}
			}

			controlPanel.problems.hidden = true;

		}

		this.messages = [];

	}

	/**
	 * View the control panel.
	 * 
	 * @param {boolean} [focus] Whether to bring the panel into focus.
	 * @returns {ControlPanelTab}
	 */
	static view = (focus = true) => {

		const controlPanel = this.find();

		if (controlPanel !== undefined) {
			
			if (focus) {
				controlPanel.focus();
			}

			return controlPanel;

		}

		const file = new GmlFile(this.tabName, null, ControlPanelFileKind.inst);
		GmlFile.openTab(file);

		return /** @type {ControlPanelTab} */ (file.editor);

	}

	/**
	 * Find the existing open control panel, if it is open.
	 * @returns {ControlPanelTab|undefined}
	 */
	static find = () => {

		const tabs = Array.from(ChromeTabs.getTabs());
		const editors = tabs.map(tab => tab.gmlFile.editor);

		return editors.find(
			/** @returns {editor is ControlPanelTab} */ 
			(editor) => editor instanceof ControlPanelTab
		);
	}

	/**
	 * @private
	 */
	onOpenProject = () => {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		this.projectSettingsSetup(project);
		this.projectSettings.hidden = false;
		
		ProjectProperties.events.on('changeBuildConfig', this.onBuildConfigChange);
		ProjectProperties.events.on('changeRuntimeChannel', this.onRuntimeListChanged);
		Preferences.events.on('runtimeListChanged', this.onRuntimeListChanged);

	}

	/**
	 * @private
	 */
	onCloseProject = () => {
		
		this.projectSettings.hidden = true;
		
		for (const element of Array.from(this.projectSettings.children)) {
			if (!(element instanceof HTMLLegendElement)) {
				element.remove();
			}
		}

		ProjectProperties.events.off('changeBuildConfig', this.onBuildConfigChange);
		ProjectProperties.events.off('changeRuntimeChannel', this.onRuntimeListChanged);
		Preferences.events.off('runtimeListChanged', this.onRuntimeListChanged);

	}

	/**
	 * Update the build config dropdown state if the user chose a different config in the tree.
	 * 
	 * @private
	 * @param {{ current: string }} event
	 */
	onBuildConfigChange = ({ current }) => {
		
		const dropdown = this.projectSettings.buildConfigDropdown;

		if (dropdown === undefined) {
			return;
		}

		UIDropdownGetSelect(dropdown).value = current;

	}

	/**
	 * Update the runtime versions dropdown after a change to the channel type changes the list.
	 * 
	 * @private
	 * @param {GMChannelType|undefined} channelType The channel type for which the runtime list has changed.
	 */
	onRuntimeListChanged = (channelType) => {

		if (this.projectSettings.runtimeVersionDropdown === undefined) {
			return;
		}

		if (channelType !== ProjectProperties.runtimeChannelTypeOrDef) {
			return;
		}

		UIDropdownMutate(
			this.projectSettings.runtimeVersionDropdown,
			[...preferencesMenu.runtime_version_strings_get_for_type(channelType), USE_DEFAULT],
			USE_DEFAULT
		);

	}

	/**
	 * Setup project-specific settings.
	 * 
	 * @private
	 * @param {GMEdit.Project} project 
	 */
	projectSettingsSetup(project) {

		this.projectSettings.appendChild(ui.em(`Configure behaviour for ${project.displayName}.`));

		const configs = project_config_tree_get(project);

		this.projectSettings.buildConfigDropdown = UIPreferences.addDropdown(
			this.projectSettings,
			'Build Configuration',
			ProjectProperties.buildConfig,
			project_config_tree_to_array(configs),
			(config_name) => ProjectProperties.buildConfig = config_name
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runner Type',
			ProjectProperties.runtimeBuildType ?? USE_DEFAULT,
			[...VALID_RUNNER_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeBuildType = default_undefined(value)
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Channel Type',
			ProjectProperties.runtimeChannelType ?? USE_DEFAULT,
			[...GM_CHANNEL_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeChannelType = default_undefined(value)
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Reuse compiler output tab between runs',
			use(ProjectProperties.reuseCompilerTab)
				?.let(it => it ? 'True' : 'False')
				.value ?? USE_DEFAULT,
			['True', 'False', USE_DEFAULT],
			(value) => {
				switch (value) {
					case 'True': return ProjectProperties.reuseCompilerTab = true;
					case 'False': return ProjectProperties.reuseCompilerTab = false;
					case USE_DEFAULT: return ProjectProperties.reuseCompilerTab = undefined;
				}
			}
		);

		this.projectSettings.runtimeVersionDropdown = UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Version',
			ProjectProperties.runtimeVersion ?? USE_DEFAULT,
			[...preferencesMenu.runtime_version_strings_get_for_type(ProjectProperties.runtimeChannelTypeOrDef), USE_DEFAULT],
			(value) => ProjectProperties.runtimeVersion = default_undefined(value)
		);

	}

	/**
	 * Setup the global preferences.
	 * @private
	 */
	globalSettingsSetup() {

		this.globalSettings.appendChild(ui.em(`Configure the default behaviour of ${plugin_name}.`));
		preferencesMenu.menu_create(this.globalSettings);

	}

	destroy = () => {
		GMEdit.off('projectOpen', this.onOpenProject);
		GMEdit.off('projectClose', this.onCloseProject);
	}

}
