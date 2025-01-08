
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../utils/project.js';
import { UIDropdownGetSelect, UIDropdownMutate } from '../../utils/gmedit/UIPreferencesUtils.js';
import { ConstructorTab, ConstructorTabFileKind } from './ConstructorTab.js';
import { ProjectProperties } from '../../preferences/ProjectProperties.js';
import * as ui from '../ui-wrappers.js';
import * as preferencesMenu from '../PreferencesMenu.js';
import { plugin_name, plugin_version } from '../../GMConstructor.js';
import { use } from '../../utils/scope-extensions/use.js';
import { GM_CHANNEL_TYPES, Preferences, ZEUS_RUNTIME_TYPES } from '../../preferences/Preferences.js';

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

	/** @type {ControlPanel.ProblemContainer[]} */
	static problems = [];

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

		this.problems = ui.group(this.element, 'Problems', [
			ui.text_button('Dismiss All', ControlPanelTab.dismissAll)
		]);
		this.problems.classList.add('gm-constructor-control-panel-errors');
		this.problems.hidden = true;

		this.projectSettings = ui.group(this.element, 'Project Settings');
		this.projectSettings.hidden = true;

		this.globalSettings = ui.group(this.element, 'Global Settings');

		ControlPanelTab.problems.forEach(this.showProblem);
		
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
	 * 
	 * @param {string} title
	 * @param {IErr} err
	 */
	static error = (title, err) => this.addProblem({ severity: 'error', title, err });

	/**
	 * Show the user a warning in the UI.
	 * 
	 * @param {string} title
	 * @param {IErr} err
	 */
	static warn = (title, err) => this.addProblem({ severity: 'warning', title, err });

	/**
	 * Show the user a debug message in the UI.
	 * 
	 * @param {string} title
	 * @param {IErr} err
	 */
	static debug = (title, err) => this.addProblem({ severity: 'debug', title, err });

	/**
	 * Show the user a message in the UI.
	 * 
	 * @private
	 * @param {ControlPanel.ProblemContainer} message
	 */
	static addProblem = (message) => {

		/** 
		 * @type { {[key in ControlPanel.ProblemSeverity]: (message?: any) => void} }
		 */
		const severity_logs = {
			error: console.error,
			warning: console.warn,
			debug: console.info
		};

		const { severity, title, err } = message;

		this.problems.push(message);

		const log = severity_logs[severity];
		log(`${title} - ${err}`);

		const controlPanel = this.find();

		if (controlPanel !== undefined) {
			controlPanel.showProblem(message);
		}

		return this;

	}

	/**
	 * Show the user a message in the UI.
	 * 
	 * @private
	 * @param {ControlPanel.ProblemContainer} message
	 */
	showProblem = (message) => {

		/** 
		 * @type { {[key in ControlPanel.ProblemSeverity]: string[]} }
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

				const index = ControlPanelTab.problems.indexOf(message);

				if (index === -1) {
					return;
				}

				ControlPanelTab.problems.splice(index, 1);

				if (ControlPanelTab.problems.length === 0) {
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
	 * @private
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

		this.problems = [];

	}

	/**
	 * View the control panel.
	 * 
	 * @param {boolean} [focus] Whether to bring the panel into focus.
	 * @returns {ControlPanelTab}
	 */
	static view(focus = true) {

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
	static find() {

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

		// TODO: Workaround for GMEdit bug where hitting Ctrl+R doesn't call `onCloseProject`.
		this.onCloseProject();

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		if (!project.isGMS23) {
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

		this.projectSettings.buildConfigDropdown.classList.add('singleline');

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runner Platform',
			ProjectProperties.zeusPlatform ?? 'Current Platform',
			['Current Platform', 'HTML5', 'OperaGX'],
			(value) => ProjectProperties.zeusPlatform = (value === 'Current Platform') ? undefined : value
		).classList.add('singleline');

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Type',
			ProjectProperties.runtimeBuildType ?? USE_DEFAULT,
			[...ZEUS_RUNTIME_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeBuildType = default_undefined(value)
		).classList.add('singleline');

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Release Channel',
			ProjectProperties.runtimeChannelType ?? USE_DEFAULT,
			[...GM_CHANNEL_TYPES, USE_DEFAULT],
			(value) => ProjectProperties.runtimeChannelType = default_undefined(value)
		).classList.add('singleline');
		
		this.projectSettings.runtimeVersionDropdown = UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Version',
			ProjectProperties.runtimeVersion ?? USE_DEFAULT,
			[...preferencesMenu.runtime_version_strings_get_for_type(ProjectProperties.runtimeChannelTypeOrDef), USE_DEFAULT],
			(value) => ProjectProperties.runtimeVersion = default_undefined(value)
		);
		
		this.projectSettings.runtimeVersionDropdown.classList.add('singleline');
		
		UIPreferences.addDropdown(
			this.projectSettings,
			'Reuse existing compiler tab',
			use(ProjectProperties.reuseCompilerTab)
				?.let(it => it ? 'Yes' : 'No')
				.value ?? USE_DEFAULT,
			['Yes', 'No', USE_DEFAULT],
			(value) => {
				switch (value) {
					case 'Yes': return ProjectProperties.reuseCompilerTab = true;
					case 'No': return ProjectProperties.reuseCompilerTab = false;
					case USE_DEFAULT: return ProjectProperties.reuseCompilerTab = undefined;
				}
			}
		).classList.add('singleline');
		
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
