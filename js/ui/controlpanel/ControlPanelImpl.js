import { BaseError } from '../../utils/Err.js';
import { PreferencesMenu } from '../preferences/PreferencesMenu.js';
import { ProjectPropertiesMenu } from '../preferences/ProjectPropertiesMenu.js';
import { ControlPanelTab } from './ControlPanelTab.js';

/**
 * Implementation of the error reporter which uses the {@link ControlPanelTab} to show messages, but
 * avoids the dependency on the control panel, should we want to run the plugin headless.
 *
 * @implements {ControlPanel}
 */

export class ControlPanelImpl {

	/**
	 * The current control panel tab, if one is open.
	 * @type {ControlPanelTab|undefined}
	 */
	_tab = undefined;

	/**
	 * @returns {ControlPanelTab|undefined}
	 */
	get tab() {
		
		if (this._tab?.invalid === false) {
			return this._tab;
		}

		return undefined;

	}

	/**
	 * The preferences menu to be displayed on the control panel.
	 * 
	 * @private
	 * @type {PreferencesMenu|undefined}
	 */
	preferencesMenu = undefined;

	/**
	 * The project properties menu for the current project, if any.
	 * 
	 * @private
	 * @type {ProjectPropertiesMenu|undefined}
	 */
	projectPropertiesMenu = undefined;

	/**
	 * @private
	 * @type {ControlPanel.Problem[]}
	 */
	problems = [];

	/**
	 * Non-UI methods of logging problems, based on their severity.
	 *
	 * @private
	 * @readonly
	 * @type {{ [key in ControlPanel.ProblemSeverity]: (message: string, err: BaseError) => void }}
	 */
	logMethods = {
		error: console.error,
		warning: console.warn,
		debug: console.info
	};

	/**
	 * @param {PreferencesMenu} preferencesMenu
	 */
	setPreferencesMenu(preferencesMenu) {
		this.preferencesMenu = preferencesMenu;
		this.tab?.setupPreferencesMenu(this.preferencesMenu.element);
	}

	/**
	 * @type {ControlPanel['setProjectPropertiesMenu']}
	 */
	setProjectPropertiesMenu(projectPropertiesMenu) {

		if (this.projectPropertiesMenu !== undefined) {
			this.clearProjectPropertiesMenu();
		}

		this.projectPropertiesMenu = projectPropertiesMenu;
		this.tab?.setupProjectPropertiesMenu(this.projectPropertiesMenu.element);

	}

	/**
	 * @type {ControlPanel['clearProjectPropertiesMenu']}
	 */
	clearProjectPropertiesMenu() {
		if (this.projectPropertiesMenu !== undefined) {
			
			this.tab?.removeProjectPropertiesMenu();
			this.projectPropertiesMenu.destroy();

			delete this.projectPropertiesMenu;
			
		}
	}

	open() {

		const GmlFile = $gmedit['gml.file.GmlFile'];

		if (this.tab !== undefined) {
			this.tab.focus();
			return this.tab;
		}

		const file = new GmlFile(ControlPanelTab.tabName, null, new ControlPanelFileKind(this));
		GmlFile.openTab(file);

		this._tab = /** @type {ControlPanelTab} */ (file.editor);

		if (this.preferencesMenu !== undefined) {
			this._tab.setupPreferencesMenu(this.preferencesMenu.element);
		}

		if (this.projectPropertiesMenu !== undefined) {
			this._tab.setupProjectPropertiesMenu(this.projectPropertiesMenu.element);
		}

		return this._tab;

	}

	destroy() {

		this.tab?.close();
		delete this._tab;

		this.preferencesMenu?.destroy();
		delete this.preferencesMenu;

		this.projectPropertiesMenu?.destroy();
		delete this.projectPropertiesMenu;

		this.clearAllProblems();

	}

	/**
	 * @type {ProblemLogger['error']}
	 */
	error(title, err) {

		this.appendProblem({ severity: 'error', title, err });
		this.open();

		return this;

	};

	/**
	 * @type {ProblemLogger['warn']}
	 */
	warn(title, err) {
		this.appendProblem({ severity: 'warning', title, err });
		return this;
	}

	/**
	 * @type {ProblemLogger['debug']}
	 */
	debug(title, err) {
		this.appendProblem({ severity: 'debug', title, err });
		return this;
	}

	/**
	 * Show the user a message in the UI.
	 *
	 * @private
	 * @param {ControlPanel.Problem} problem
	 */
	appendProblem(problem) {
		this.logMethods[problem.severity](problem.title, problem.err);

		this.problems.push(problem);
		this.tab?.addProblemInUI(problem);
	};

	/**
	 * @param {ControlPanel.Problem} problem
	 */
	clearProblem(problem) {

		const index = this.problems.indexOf(problem);

		if (index === -1) {
			return;
		}

		this.problems.splice(index, 1);
		this.tab?.removeProblemInUI(problem);

	};

	clearAllProblems() {
		
		if (this.tab !== undefined) {
			for (const problem of this.problems) {
				this.tab.removeProblemInUI(problem);
			}
		}

		this.problems.length = 0;

	}

}

const FileKind = $gmedit['file.FileKind'];

/**
 * File type for the control panel. Acts as an intermediary for passing relevant information to the
 * control panel on initialization.
 */
class ControlPanelFileKind extends FileKind {

	/**
	 * @type {ControlPanelImpl}
	 */
	controlPanel;

	/**
	 * @param {ControlPanelImpl} controlPanel 
	 */
	constructor(controlPanel) {

		super();

		this.checkSelfForChanges = false;
		this.controlPanel = controlPanel;

	}

	/** 
	 * @type {GMEdit.FileKind['init']} 
	 */
	init(file) {
		file.editor = new ControlPanelTab(file, this.controlPanel);
	}

}
