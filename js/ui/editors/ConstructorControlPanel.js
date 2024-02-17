import { Job } from '../../compiler/job/Job.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

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

        this.element.classList.add('gm-constructor-control-panel');

        const title = document.createElement('h1');
        title.textContent = ConstructorControlPanel.tabName;

        this.element.appendChild(title);

        

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

}
