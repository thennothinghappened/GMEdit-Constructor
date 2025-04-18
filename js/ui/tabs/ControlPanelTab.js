
import { ConstructorTab, ConstructorTabFileKind } from './ConstructorTab.js';
import * as ui from '../ui-wrappers.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from '../../ConstructorPlugin.js';
import { ProjectPropertiesMenu } from '../preferences/ProjectPropertiesMenu.js';
import { BaseError, InvalidStateErr } from '../../utils/Err.js';
import { PreferencesMenu } from '../preferences/PreferencesMenu.js';
import { docString } from '../../utils/StringUtils.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * File type for the control panel.
 */
class ControlPanelFileKind extends ConstructorTabFileKind {

	static instance = new ControlPanelFileKind();

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
 * 
 * The control panel is a a core part of Constructor's UI, as it handles:
 * - Showing errors and warnings to the user.
 * - Configuring global preferences.
 * - Configuring project-specific preferences.
 * 
 * The latter two tasks are also possible through GMEdit's own UI for the respective functions, but
 * the first task is most important to provide feedback for configuration issues, or plugin logic
 * errors.
 */
export class ControlPanelTab extends ConstructorTab {

	static tabName = 'GMEdit-Constructor Control Panel';

	/** @type {ControlPanel.ProblemContainer[]} */
	static problems = [];

	/**
	 * @private
	 * @type {PreferencesMenu|undefined}
	 */
	preferencesMenu = undefined;

	/**
	 * @private
	 * @type {ProjectPropertiesMenu|undefined}
	 */
	projectPropertiesMenu = undefined;

	/**
	 * @private
	 * @type {UIGroup}
	 */
	preferencesGroupElement;

	/**
	 * @private
	 * @type {UIGroup}
	 */
	projectPropertiesGroupElement;

	/**
	 * @param {GMEdit.GmlFile} file
	 */
	constructor(file) {
		
		super(file);

		this.element.classList.add('gm-constructor-control-panel', 'popout-window');

		this.element.appendChild(ui.h1(ControlPanelTab.tabName));
		this.element.appendChild(ui.p(`Version: ${PLUGIN_VERSION}`));

		this.problems = ui.group(this.element, 'Problems', [
			ui.text_button('Dismiss All', this.dismissAll)
		]);
		this.problems.classList.add('gm-constructor-control-panel-errors');
		this.problems.hidden = true;

		this.projectPropertiesGroupElement = ui.group(this.element, 'Project Settings');
		this.projectPropertiesGroupElement.hidden = true;

		this.preferencesGroupElement = ui.group(this.element, 'Global Settings');

		ControlPanelTab.problems.forEach(this.showProblem);

	}

	/**
	 * Reset the control panel's state for reloading the plugin.
	 */
	static cleanup() {
		
		const instance = this.find();

		if (instance !== undefined) {
			instance.dismissAll();
			instance.close();
		}

		this.problems.length = 0;

	}

	/**
	 * Show the user an error in the UI.
	 * 
	 * @param {string} title
	 * @param {BaseError} err
	 */
	static error = (title, err) => this.addProblem({ severity: 'error', title, err });

	/**
	 * Show the user a warning in the UI.
	 * 
	 * @param {string} title
	 * @param {BaseError} err
	 */
	static warn = (title, err) => this.addProblem({ severity: 'warning', title, err });

	/**
	 * Show the user a debug message in the UI.
	 * 
	 * @param {string} title
	 * @param {BaseError} err
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
		error.scrollIntoView();

	}

	/**
	 * Dismiss all errors in the panel.
	 * @private
	 */
	dismissAll = () => {

		this.problems.hidden = true;

		for (const element of Array.from(this.problems.children)) {
			if (element instanceof HTMLFieldSetElement) {
				element.remove();
			}
		}

		ControlPanelTab.problems.length = 0;

	}

	/**
	 * Find the existing open control panel, if it is open.
	 * @returns {ControlPanelTab|undefined}
	 */
	static find() {

		const tabs = Array.from(ChromeTabs.getTabs());
		const editors = tabs.map(tab => tab.gmlFile.editor);

		return editors.find(editor => editor instanceof ControlPanelTab);

	}

	/**
	 * Show the control panel. If the tab is open already, it is switched to, otherwise it is
	 * opened.
	 * 
	 * @returns {ControlPanelTab}
	 */
	static show() {

		const controlPanel = this.find();

		if (controlPanel !== undefined) {
			controlPanel.focus();
			return controlPanel;
		}

		const file = new GmlFile(this.tabName, null, ControlPanelFileKind.instance);
		GmlFile.openTab(file);

		return /** @type {ControlPanelTab} */ (file.editor);

	}

	/**
	 * @param {PreferencesMenu} preferencesMenu
	 */
	setupPreferencesMenu(preferencesMenu) {

		if (this.preferencesMenu !== undefined) {
			
			ControlPanelTab.error('Plugin Logic Error', new InvalidStateErr(docString(`
				Attempted to set up the preferences menu UI for the control panel after it was
				already set up! Constructor has entered an invalid state.
			`)));

			return;

		}
		
		this.preferencesMenu = preferencesMenu;

		this.preferencesGroupElement.appendChild(ui.em(`Configure the default behaviour of ${PLUGIN_NAME}.`));
		this.preferencesGroupElement.appendChild(this.preferencesMenu.element);

	}

	/**
	 * @param {ProjectPropertiesMenu} projectPropertiesMenu
	 */
	openProject(projectPropertiesMenu) {

		if (this.projectPropertiesMenu !== undefined) {
			this.projectPropertiesMenu.element.remove();
			this.projectPropertiesMenu.destroy();
		}

		this.projectPropertiesMenu = projectPropertiesMenu;

		this.projectPropertiesGroupElement.appendChild(this.projectPropertiesMenu.element);
		this.projectPropertiesGroupElement.hidden = false;

	}

	closeProject() {
		
		this.projectPropertiesGroupElement.hidden = true;

		if (this.projectPropertiesMenu !== undefined) {
			
			this.projectPropertiesMenu.element.remove();
			this.projectPropertiesMenu.destroy();

			delete this.projectPropertiesMenu;

		}

	}

	destroy = () => {

		if (this.projectPropertiesMenu !== undefined) {
			this.projectPropertiesMenu.destroy();
		}

		if (this.preferencesMenu !== undefined) {
			this.preferencesMenu.destroy();
		}

	}

}
