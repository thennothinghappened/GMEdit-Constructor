import { Job } from '../../compiler/job/Job.js';
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../utils/project.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as projectProperties from '../../preferences/ProjectProperties.js';
import * as ui from '../ui-wrappers.js';

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
 * Main 'control panel' for Constructor to make it a nicer experience to work with!
 */
export class ConstructorControlPanel extends ConstructorEditorView {

    static fileKind = new KConstructorControlPanel();
    static tabName = 'GMEdit-Constructor Control Panel';

    /**
     * @param {GmlFile} file
     */
    constructor(file) {
        
        super(file);

        this.element.classList.add('gm-constructor-viewer', 'gm-constructor-control-panel', 'popout-window');

        this.element.appendChild(ui.h1(ConstructorControlPanel.tabName));

        this.errors = ui.group(this.element, 'Problems', [ui.text_button('Dismiss All', this.dismissAllErrors)]);
        this.errors.classList.add('gm-constructor-control-panel-errors');

        this.projectSettings = UIPreferences.addGroup(this.element, 'Project Settings');
        this.projectSettings.hidden = true;

        this.globalSettings = UIPreferences.addGroup(this.element, 'Global Settings');
        
        GMEdit.on('projectOpen', this.onOpenProject);
        GMEdit.on('projectClose', this.onCloseProject);

        if (project_is_open()) {
            this.onOpenProject();
        }

    }

    /**
     * Show the user an error in the UI.
     * @param {string} title
     * @param {IErr} err
     */
    showError = (title, err) => {

        console.error(`${title} - ${err}`);

        const error = ui.group(this.errors, title, [
            ui.text_button('Dismiss', () => error.remove())
        ]);

        error.classList.add('gm-constructor-error');

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
    dismissAllErrors = () => {

        for (const element of Array.from(this.errors.children)) {
            if (element instanceof HTMLFieldSetElement) {
                element.remove();
            }
        }
    }

    /**
     * View the control panel.
     * @returns {ConstructorControlPanel}
     */
    static view = () => {

        const controlPanel = this.find();

        if (controlPanel !== undefined) {
            
            controlPanel.file.tabEl.click();
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

        this.projectSettingsSetup(project);
        this.projectSettings.hidden = false;

    }

    onCloseProject = () => {
        this.projectSettings.hidden = true;
    }

    /**
     * Setup project-specific settings.
     * @param {GMLProject} project 
     */
    projectSettingsSetup(project) {

        const configs = project_config_tree_get(project);

        UIPreferences.addDropdown(
            this.projectSettings,
            'Build Configuration',
            projectProperties.config_name_get(),
            project_config_tree_to_array(configs),
            projectProperties.config_name_set
        );

    }

    /**
     * Setup the global preferences.
     */
    globalSettingsSetup() {
        
        

    }

    destroy = () => {
        GMEdit.off('projectOpen', this.onOpenProject);
        GMEdit.off('projectClose', this.onCloseProject);
    }

}
