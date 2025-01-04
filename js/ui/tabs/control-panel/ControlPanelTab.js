
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../../utils/project.js';
import { UIDropdownGetSelect, UIDropdownMutate } from '../../../utils/ui.js';
import { ConstructorTab, ConstructorTabFileKind } from '../ConstructorTab.js';
import * as projectProperties from '../../../preferences/ProjectProperties.js';
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

	/** @type {HTMLDivElement?} */
	#runtimeVersionDropdown = null;

	/**
	 * @param {GMEdit.GmlFile} file
	 */
	constructor(file) {
		
		super(file);

		this.element.classList.add('gm-constructor-control-panel', 'popout-window');

		this.element.appendChild(ui.h1(ControlPanelTab.tabName));
		this.element.appendChild(ui.p(`Version: ${plugin_version}`));

		this.problems = ui.group(this.element, 'Problems', [ui.text_button('Dismiss All', ControlPanelTab.dismissAllErrors)]);
		this.problems.classList.add('gm-constructor-control-panel-errors');

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

	}

	/**
	 * Dismiss all errors in the panel.
	 */
	static dismissAllErrors = () => {

		const controlPanel = this.find();

		if (controlPanel !== undefined) {

			for (const element of Array.from(controlPanel.problems.children)) {
				if (element instanceof HTMLFieldSetElement) {
					element.remove();
				}
			}
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

	onOpenProject = () => {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}

		// Just makes sure we aren't repeating ourselves.
		this.onCloseProject();

		this.projectSettingsSetup(project);
		this.projectSettings.hidden = false;

	}

	onCloseProject = () => {
		
		this.projectSettings.hidden = true;
		this.#runtimeVersionDropdown = null;
		
		for (const element of Array.from(this.projectSettings.children)) {
			if (!(element instanceof HTMLLegendElement)) {
				element.remove();
			}
		}

	}

	/**
	 * Setup project-specific settings.
	 * @param {GMEdit.Project} project 
	 */
	projectSettingsSetup(project) {

		this.projectSettings.appendChild(ui.em(`Configure behaviour for ${project.displayName}.`));

		const configs = project_config_tree_get(project);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Build Configuration',
			projectProperties.config_name_get(),
			project_config_tree_to_array(configs),
			projectProperties.config_name_set
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runner Type',
			projectProperties.runner_project_get() ?? USE_DEFAULT,
			[...VALID_RUNNER_TYPES, USE_DEFAULT],
			(value) => projectProperties.runner_set(default_undefined(value))
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Channel Type',
			projectProperties.runtime_project_channel_type_get() ?? USE_DEFAULT,
			[...GM_CHANNEL_TYPES, USE_DEFAULT],
			(value) => {
				projectProperties.runtime_channel_type_set(default_undefined(value));
				this.updateRuntimeVersionDropdown();
			}
		);

		UIPreferences.addDropdown(
			this.projectSettings,
			'Reuse compiler output tab between runs',
			use(projectProperties.reuse_compiler_tab_project_get())
				?.let(it => it ? 'True' : 'False')
				.value ?? USE_DEFAULT,
			['True', 'False', USE_DEFAULT],
			(value) => {
				switch (value) {
					case 'True': return projectProperties.reuse_compiler_tab_set(true);
					case 'False': return projectProperties.reuse_compiler_tab_set(false);
					case USE_DEFAULT: return projectProperties.reuse_compiler_tab_set(undefined);
				}
			}
		);

		this.#runtimeVersionDropdown = UIPreferences.addDropdown(
			this.projectSettings,
			'Runtime Version',
			projectProperties.runtime_project_version_get() ?? USE_DEFAULT,
			[...preferencesMenu.runtime_version_strings_get_for_type(projectProperties.runtime_channel_type_get()), USE_DEFAULT],
			(value) => {

				if (value === USE_DEFAULT) {
					projectProperties.runtime_version_set(undefined);
					return;
				}

				projectProperties.runtime_version_set(value);

			}
		);

	}

	/**
	 * Setup the global preferences.
	 */
	globalSettingsSetup() {

		this.globalSettings.appendChild(ui.em(`Configure the default behaviour of ${plugin_name}.`));

		preferencesMenu.menu_create(this.globalSettings, () => {
			this.updateRuntimeVersionDropdown();
		});

	}

	/**
	 * Mutate the list of runtime versions for the project in-place.
	 */
	updateRuntimeVersionDropdown() {

		if (this.#runtimeVersionDropdown === null) {
			return;
		}

		const type = projectProperties.runtime_channel_type_get();

		UIDropdownMutate(
			this.#runtimeVersionDropdown,
			[...preferencesMenu.runtime_version_strings_get_for_type(type), USE_DEFAULT],
			USE_DEFAULT
		);

		const select = UIDropdownGetSelect(this.#runtimeVersionDropdown);

		if (select.value === USE_DEFAULT) {
			projectProperties.runtime_version_set(undefined);
		} else {
			projectProperties.runtime_version_set(select.value);
		}

	}

	destroy = () => {
		GMEdit.off('projectOpen', this.onOpenProject);
		GMEdit.off('projectClose', this.onCloseProject);
	}

}
