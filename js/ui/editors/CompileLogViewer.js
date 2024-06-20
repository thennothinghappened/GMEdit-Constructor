import { Job } from '../../compiler/job/Job.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as ui from '../ui-wrappers.js';
import { JobError } from '../../compiler/job/JobError.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];
const UIPreferences = $gmedit['ui.Preferences'];

/**
 * File type for a compile job.
 */
class KConstructorOutput extends ConstructorViewFileKind {

    constructor() {
        super();
        this.checkSelfForChanges = false;
    }

    /**
     * @param {GmlFile} file
     * @param {Job} job
     */
    init = (file, job) => {
        file.editor = new CompileLogViewer(file, job);
    }

    /**
     * @param {Job} job
     */
    static getJobName = (job) => {
        const statusDisplay = job.statusDisplay === '' ? '' : (' - ' + job.statusDisplay);
        return `${job.projectDisplayName} - ${job.command}${statusDisplay}`;
    }

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends ConstructorEditorView {

    static fileKind = new KConstructorOutput();
    static scrollGrabMargin = 32;

    /** @type {Job} */
    job;

    /** @type {UIGroup} */
    info_group;

    /** @type {HTMLPreElement} */
    log;

    /** @type {HTMLFieldSetElement} */
    errors;

    /**
     * @param {GmlFile} file
     * @param {Job} job
     */
    constructor(file, job) {

        super(file);

        this.uiCreate(job);
        this.watchJob(job);
    }

    /**
     * @param {Job} job
     */
    watchJob = (job) => {

        this.job = job;

        this.job.on('stdout', (content) => {

            const should_scroll =
                (this.info_group.scrollTop + this.info_group.clientHeight) >= (this.info_group.scrollHeight - CompileLogViewer.scrollGrabMargin);

            this.log.textContent = content;

            if (should_scroll) {
                this.goToBottom();
            }

        });

        this.job.on('stop', (/** @type {Array<JobError>} */ errors) => {

            const job_name = KConstructorOutput.getJobName(this.job);

            this.info_group.legend.childNodes[0].textContent = job_name;

            this.file.rename(job_name, '');

            if (errors.length > 0) {

                for (const err of errors) {
                    err.displayHTML(this.errors);
                }
                
                this.errors.hidden = false;
                this.errors.classList.remove('collapsed');
                this.goToBottom();
                
            }

        });

    }

    /**
     * Create the page UI
     * @param {Job} job 
     */
    uiCreate(job) {

        this.element.innerHTML = '';
        this.element.classList.add('gm-constructor-viewer', 'popout-window');

        this.info_group = ui.group(this.element, KConstructorOutput.getJobName(job), [
            ui.text_button('Stop', this.stopJob),
            ui.text_button('Go to bottom', this.goToBottom)
        ]);
        this.info_group.classList.add('gm-constructor-info');
        
        this.log = ui.pre('');
        this.log.className = 'gm-constructor-log';
        this.info_group.appendChild(this.log);

        this.errors = UIPreferences.addGroup(this.element, 'Errors');
        this.errors.classList.add('gm-constructor-errors');
        this.errors.classList.add('collapsed');
        this.errors.hidden = true;

    }

    /**
     * Set up an editor tab for a Job, and view it.
     * @param {Job} job
     * @param {Boolean} reuse Whether to reuse an existing tab.
     * @returns {void}
     */
    static view = (job, reuse) => {

        if (!reuse) {

            const file = new GmlFile(
                KConstructorOutput.getJobName(job),
                null,
                this.fileKind,
                job
            );
            
            return GmlFile.openTab(file);
            
        }

        const tabs = Array.from(ChromeTabs.getTabs());
        const editors = tabs.map(tab => tab.gmlFile.editor);

        /** @type {CompileLogViewer|undefined} */
        // @ts-ignore
        const compilerViewer = editors.find(editor => editor instanceof CompileLogViewer);

        if (compilerViewer === undefined) {
            return this.view(job, false);
        }

        compilerViewer.stopJob();
        compilerViewer.uiCreate(job);
        compilerViewer.watchJob(job);
        
        return compilerViewer.file.tabEl.click();

    }

    /**
     * Go the the bottom of the log.
     */
    goToBottom = () => {
        this.info_group.scrollTop = this.info_group.scrollHeight;
    }

    stopJob = () => {
        if (this.job.status.status !== 'stopped') {
            this.job.stop();
        }
    }

    /**
     * Called when closing the tab,
     * for now we have it also kill the job, so it doesn't run
     * on in the background.
     */
    destroy = () => {
        this.stopJob();
    }
}
