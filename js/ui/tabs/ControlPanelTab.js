
import { project_current_get } from '../../utils/project.js';
import { ConstructorTab, ConstructorTabFileKind } from './ConstructorTab.js';
import * as ui from '../ui-wrappers.js';
import * as preferencesMenu from '../preferences/PreferencesMenu.js';
import { plugin_name, plugin_version } from '../../GMConstructor.js';
import { Preferences } from '../../preferences/Preferences.js';
import { ProjectPropertiesMenu } from '../preferences/ProjectPropertiesMenu.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

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
	 * @type {UIGroup}
	 */
	projectSettingsElement;

	/**
	 * @private
	 * @type {ProjectPropertiesMenu}
	 */
	projectPropertiesMenu = new ProjectPropertiesMenu();

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

		this.projectSettingsElement = ui.group(this.element, 'Project Settings');
		this.projectSettingsElement.hidden = true;
		this.projectSettingsElement.appendChild(this.projectPropertiesMenu.element);

		this.globalSettings = ui.group(this.element, 'Global Settings');

		ControlPanelTab.problems.forEach(this.showProblem);
		
		if (Preferences.ready) {
			this.globalSettingsSetup();
		}

		const project = project_current_get();

		if (project !== undefined) {
			this.onOpenProject({ project });
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
	 * @param {{ project: GMEdit.Project }} event
	 */
	onOpenProject = ({ project }) => {

		if (!project.isGMS23) {
			return;
		}

		this.projectPropertiesMenu.onOpenProject(project);
		this.projectSettingsElement.hidden = false;
		
	}

	/**
	 * @private
	 */
	onCloseProject = () => {
		
		this.projectSettingsElement.hidden = true;
		this.projectPropertiesMenu.onCloseProject();
		
		for (const element of Array.from(this.projectSettingsElement.children)) {
			if (!(element instanceof HTMLLegendElement)) {
				element.remove();
			}
		}

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
		this.projectPropertiesMenu.destroy();
	}

}
