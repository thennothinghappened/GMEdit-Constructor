import { Job } from '../../compiler/job/Job.js';
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../utils/project.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as projectProperties from '../../preferences/ProjectProperties.js';
import * as preferences from '../../preferences/Preferences.js';
import * as ui from '../ui-wrappers.js';
import * as preferencesMenu from '../PreferencesMenu.js';
import { plugin_name, plugin_version } from '../../GMConstructor.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];
const UIPreferences = $gmedit['ui.Preferences'];

/**
 * File type for the control panel.
 */
class KConstructorControlPanel extends ConstructorViewFileKind {

    constructor() {
        super();
        this.checkSelfForChanges = false;
    }

    /**
     * @param {GmlFile} file
     */
    init = (file) => {
        file.editor = new ConstructorControlPanel(file);
    }

}

/**
 * @typedef {{ severity: MessageSeverity, title: string, err: IErr }} MessageContainer
 */

/**
 * Main 'control panel' for Constructor to make it a nicer experience to work with!
 */
export class ConstructorControlPanel extends ConstructorEditorView {

    static fileKind = new KConstructorControlPanel();
    static tabName = 'GMEdit-Constructor Control Panel';

    /** @type {MessageContainer[]} */
    static messages = [];

    /**
     * @param {GmlFile} file
     */
    constructor(file) {
        
        super(file);

        this.element.classList.add('gm-constructor-viewer', 'gm-constructor-control-panel', 'popout-window');

        this.element.appendChild(ui.h1(ConstructorControlPanel.tabName));
        this.element.appendChild(ui.p(`Version: ${plugin_version}`));

        this.problems = ui.group(this.element, 'Problems', [ui.text_button('Dismiss All', ConstructorControlPanel.dismissAllErrors)]);
        this.problems.classList.add('gm-constructor-control-panel-errors');

        this.projectSettings = UIPreferences.addGroup(this.element, 'Project Settings');
        this.projectSettings.hidden = true;

        this.globalSettings = UIPreferences.addGroup(this.element, 'Global Settings');

        ConstructorControlPanel.messages.forEach(this.#showMessage);
        
        if (preferences.ready()) {
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
        return ConstructorControlPanel.showError(title, err);
    }

    /**
     * Show the user a warning in the UI.
     * @param {string} title
     * @param {IErr} err
     */
    showWarning = (title, err) => {
        return ConstructorControlPanel.showWarning(title, err);
    }

    /**
     * Show the user a debug message in the UI.
     * @param {string} title
     * @param {IErr} err
     */
    showDebug = (title, err) => {
        return ConstructorControlPanel.showDebug(title, err);
    }

    /**
     * Show the user a message in the UI.
     * @param {MessageContainer} message
     */
    static #appendMessage = (message) => {

        /** 
         * @type { {[key in MessageSeverity]: (message?: any) => void} }
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
     * @param {MessageContainer} message
     */
    #showMessage = (message) => {

        /** 
         * @type { {[key in MessageSeverity]: string[]} }
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

                const index = ConstructorControlPanel.messages.indexOf(message);

                if (index === -1) {
                    return;
                }

                ConstructorControlPanel.messages.splice(index, 1);
            })
        ]);

        error.classList.add(...css_classes);

        if (err.solution !== undefined) {
            error.appendChild(ui.p(err.solution));
        }
        
        const stacktrace = UIPreferences.addGroup(error, 'Stack trace (click to expand)');
        stacktrace.appendChild(ui.pre(err.toString()));
        stacktrace.classList.add('collapsed');

        return this;

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
     * @param {boolean} [focus] Whether to bring the panel into focus.
     * @returns {ConstructorControlPanel}
     */
    static view = (focus = true) => {

        const controlPanel = this.find();

        if (controlPanel !== undefined) {
            
            if (focus) {
                controlPanel.file.tabEl.click();
            }

            return controlPanel;
        }

        const file = new GmlFile(this.tabName, null, this.fileKind);
        GmlFile.openTab(file);

        // @ts-ignore
        return file.editor;

    }

    /**
     * Find the existing open control panel, if it is open.
     * @returns {ConstructorControlPanel|undefined}
     */
    static find = () => {

        const tabs = Array.from(ChromeTabs.getTabs());
        const editors = tabs.map(tab => tab.gmlFile.editor);

        return editors.find(
            /** @returns {editor is ConstructorControlPanel} */ 
            (editor) => editor instanceof ConstructorControlPanel
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
        
        for (const element of Array.from(this.projectSettings.children)) {
            if (!(element instanceof HTMLLegendElement)) {
                element.remove();
            }
        }

    }

    /**
     * Setup project-specific settings.
     * @param {GMLProject} project 
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
            'Runtime Channel Type',
            projectProperties.runtime_channel_type_get(),
            [...preferences.valid_runtime_types, 'Use Default'],
            (value) => {

                if (value === 'Use Default') {
                    projectProperties.runtime_channel_type_set(undefined);
                    return;
                }

                // @ts-ignore
                projectProperties.runtime_channel_type_set(value);
            }
        );

    }

    /**
     * Setup the global preferences.
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
