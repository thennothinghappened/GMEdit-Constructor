import { Job } from '../../compiler/job/Job.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as ui from '../ui-wrappers.js';

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

    /** @type {HTMLInputElement} */
    stop_btn;

    /** @type {HTMLPreElement} */
    log;

    /** @type {HTMLDivElement} */
    cmd;

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
                (this.log.scrollTop + this.log.clientHeight) >= (this.log.scrollHeight - CompileLogViewer.scrollGrabMargin);

            this.log.textContent = content;

            if (should_scroll) {
                this.log.scrollTop = this.log.scrollHeight;
            }

        });

        this.job.on('stop', (errors) => {

            const job_name = KConstructorOutput.getJobName(this.job);

            this.stop_btn.disabled = true;
            this.cmd.textContent = job_name;

            this.file.rename(job_name, '');

            errors?.forEach(err => this.errors.appendChild(err.displayHTML()));

        });

    }

    /**
     * Create the page UI
     * @param {Job} job 
     */
    uiCreate(job) {

        this.element.innerHTML = '';
        this.element.classList.add('gm-constructor-viewer');

        const info = UIPreferences.addGroup(this.element, 'Info');
        info.classList.add('gm-constructor-info');

        this.stop_btn = UIPreferences.addBigButton(info, 'Stop', this.stopJob).querySelector('input');

        this.cmd = UIPreferences.addText(info, KConstructorOutput.getJobName(job));
        this.cmd.classList.add('gm-constructor-info-cmd');

        this.log = ui.pre('');
        this.log.className = 'gm-constructor-log';

        this.element.appendChild(this.log);

        this.errors = UIPreferences.addGroup(this.element, 'Errors');
        this.errors.classList.add('gm-constructor-errors');

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
