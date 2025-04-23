
import { ConstructorTab } from '../tabs/ConstructorTab.js';
import * as ui from '../ui-wrappers.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from '../../ConstructorPlugin.js';
import { SolvableError } from '../../utils/Err.js';
import { ControlPanelImpl } from './ControlPanelImpl.js';

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
 * 
 * @implements {Destroyable}
 */
export class ControlPanelTab extends ConstructorTab {

	static tabName = 'GMEdit-Constructor Control Panel';

	/**
	 * Whether this tab instance has been invalidated (destroyed).
	 */
	invalid = false;

	/**
	 * @private
	 * @type {UI.Group}
	 */
	preferencesGroupElement;

	/**
	 * @private
	 * @type {HTMLElement|undefined}
	 */
	preferencesMenuElement = undefined;

	/**
	 * @private
	 * @type {UI.Group}
	 */
	projectPropertiesGroupElement;

	/**
	 * @private
	 * @type {HTMLElement|undefined}
	 */
	projectPropertiesMenuElement = undefined;

	/**
	 * @private
	 * @type {Map<ControlPanel.Problem, HTMLElement>}
	 */
	problemElementMap = new Map();

	/**
	 * @param {GMEdit.GmlFile} file
	 * @param {ControlPanelImpl} controlPanel
	 */
	constructor(file, controlPanel) {
		
		super(file);

		this.controlPanel = controlPanel;
		this.element.classList.add('gm-constructor-control-panel', 'popout-window');

		this.element.appendChild(ui.h1(ControlPanelTab.tabName));
		this.element.appendChild(ui.p(`Version: ${PLUGIN_VERSION}`));

		this.problems = ui.group(this.element, 'Problems', [ui.text_button(
			'Dismiss All', 
			() => this.controlPanel.clearAllProblems()
		)]);

		this.problems.classList.add('gm-constructor-control-panel-errors');
		this.problems.hidden = true;

		this.projectPropertiesGroupElement = ui.group(this.element, 'Project Settings');
		this.projectPropertiesGroupElement.hidden = true;

		this.preferencesGroupElement = ui.group(this.element, 'Global Settings');

	}

	/**
	 * Show the user a message in the UI.
	 * @param {ControlPanel.Problem} problem
	 */
	addProblemInUI(problem) {

		/** 
		 * @type { {[key in ControlPanel.ProblemSeverity]: string[]} }
		 */
		const severity_classes = {
			error: ['gm-constructor-error'],
			warning: ['gm-constructor-warning', 'collapsed'],
			debug: ['gm-constructor-debug', 'collapsed']
		};

		const css_classes = severity_classes[problem.severity];

		const element = ui.group(this.problems, problem.title, [
			ui.text_button('Dismiss', () => this.controlPanel.clearProblem(problem))
		]);

		this.problemElementMap.set(problem, element);

		element.classList.add(...css_classes);
		element.appendChild(ui.p(problem.err.message));

		if (problem.err instanceof SolvableError) {
			element.appendChild(ui.h4('Suggested solution'));
			element.appendChild(ui.p(problem.err.solution));
		}
		
		const stacktrace = ui.group(element, 'Stack trace (click to expand)');
		stacktrace.appendChild(ui.pre(problem.err.toString()));
		stacktrace.classList.add('collapsed');

		this.problems.hidden = false;
		element.scrollIntoView();

	}

	/**
	 * @param {ControlPanel.Problem} problem
	 */
	removeProblemInUI(problem) {

		const element = this.problemElementMap.get(problem);

		if (element === undefined) {
			console.error(`Element ${element} does not exist in the map!!`);
			return;
		}

		element.remove();
		this.problemElementMap.delete(problem);

		if (this.problemElementMap.size === 0) {
			this.problems.hidden = true;
		}

	}

	/**
	 * @param {HTMLElement} preferencesMenuElement
	 */
	setupPreferencesMenu(preferencesMenuElement) {

		this.preferencesMenuElement = preferencesMenuElement;

		this.preferencesGroupElement.appendChild(ui.em(`Configure the default behaviour of ${PLUGIN_NAME}.`));
		this.preferencesGroupElement.appendChild(this.preferencesMenuElement);

	}

	/**
	 * @param {HTMLElement} projectPropertiesMenuElement
	 */
	setupProjectPropertiesMenu(projectPropertiesMenuElement) {

		if (this.projectPropertiesMenuElement !== undefined) {
			this.projectPropertiesGroupElement.removeChild(this.projectPropertiesMenuElement);
		}

		this.projectPropertiesMenuElement = projectPropertiesMenuElement;

		this.projectPropertiesGroupElement.appendChild(this.projectPropertiesMenuElement);
		this.projectPropertiesGroupElement.hidden = false;

	}

	removeProjectPropertiesMenu() {
		
		this.projectPropertiesGroupElement.hidden = true;

		if (this.projectPropertiesMenuElement !== undefined) {
			this.projectPropertiesGroupElement.removeChild(this.projectPropertiesMenuElement);
			delete this.projectPropertiesMenuElement;
		}

	}

	destroy() {
		super.destroy();
		this.invalid = true;
	}

}
