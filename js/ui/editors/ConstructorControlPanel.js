import { Job } from '../../compiler/job/Job.js';
import { project_config_tree_get, project_config_tree_to_array, project_current_get, project_is_open } from '../../utils/project.js';
import { h1 } from '../components/headings.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as projectProperties from '../../preferences/ProjectProperties.js';

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

        this.element.appendChild(h1(ConstructorControlPanel.tabName));

        this.projectSettings = UIPreferences.addGroup(this.element, 'Project Settings');
        this.projectSettings.hidden = true;
        
        GMEdit.on('projectOpen', this.onOpenProject);
        GMEdit.on('projectClose', this.onCloseProject);

        if (project_is_open()) {
            this.onOpenProject();
        }

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
     * View the control panel.
     */
    static view = () => {

        const tabs = Array.from(ChromeTabs.getTabs());
        const editors = tabs.map(tab => tab.gmlFile.editor);

        /** @type {ConstructorControlPanel|undefined} */
        // @ts-ignore
        const controlPanel = editors.find(editor => editor instanceof ConstructorControlPanel);

        if (controlPanel !== undefined) {
            return controlPanel.file.tabEl.click();
        }

        const file = new GmlFile(this.tabName, null, this.fileKind);
        return GmlFile.openTab(file);

    }

    destroy = () => {
        GMEdit.off('projectOpen', this.onOpenProject);
        GMEdit.off('projectClose', this.onCloseProject);
    }

}
