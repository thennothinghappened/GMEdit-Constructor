import { Job } from './Job.js';

const editor = $gmedit['editors.Editor'];
const fileKind = $gmedit['file.FileKind'];
const gmlFile = $gmedit['gml.file.GmlFile'];

/**
 * File type for a compile job.
 */
class KConstructorOutput extends fileKind {

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
        return `${job.projectDisplayName} - ${job.command}`;
    }

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends editor {

    static #fileKind = new KConstructorOutput();
    static #scrollGrabMargin = 32;

    /** @type {Job} */
    job;

    #stop_btn;
    #log;

    /**
     * @param {GmlFile} file
     * @param {Job} job
     */
    constructor(file, job) {
        super(file);

        this.job = job;

        // temporary testing log output
        this.element = document.createElement('div');
        this.element.className = 'gm-constructor-viewer';

        const info = document.createElement('div');

        this.#stop_btn = document.createElement('input');
        this.#stop_btn.type = 'button';
        this.#stop_btn.value = 'Stop';
        this.#stop_btn.onclick = this.job.stop;

        info.appendChild(this.#stop_btn);

        this.#log = document.createElement('pre');
        this.#log.className = 'gm-constructor-log';

        this.element.appendChild(info);
        this.element.appendChild(this.#log);

        this.job.on('stdout', (content) => {
            const should_scroll =
                (this.#log.scrollTop + this.#log.clientHeight) >= (this.#log.scrollHeight - CompileLogViewer.#scrollGrabMargin);

            this.#log.textContent = content;

            if (should_scroll) {
                this.#log.scrollTop = this.#log.scrollHeight;
            }
        });

        this.job.on('stop', () => {
            this.#stop_btn.disabled = true;
        });
    }

    /**
     * Set up an editor tab for a Job, and view it.
     * @param {Job} job
     */
    static view = (job) => {
        const file = new gmlFile(
            KConstructorOutput.getJobName(job),
            null,
            this.#fileKind,
            job
        );
        
        gmlFile.openTab(file);
    }

    /**
     * Called when closing the tab,
     * for now we have it also kill the job, so it doesn't run
     * on in the background.
     */
    destroy = () => {
        this.job.stop();
    }
}
