import { GMConstructorCompilerJob } from './compiler.js';

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
     * @param {GMConstructorCompilerJob} job
     */
    init = (file, job) => {
        file.editor = new CompileLogViewer(file, job);
    }

    /**
     * @param {GMConstructorCompilerJob} job
     */
    static getJobName = (job) => {
        return `${job.project.name} - ${job.command}`;
    }

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends editor {

    static #fileKind = new KConstructorOutput();

    /** @type {GMConstructorCompilerJob} */
    job;

    /**
     * @param {GmlFile} file
     * @param {GMConstructorCompilerJob} job
     */
    constructor(file, job) {
        super(file);

        this.job = job;
        this.element = document.createElement('div');

        this.job.on('stdout', (content) => {
            this.element.textContent = content;
        });
    }

    /**
     * Set up an editor tab for a Job, and view it.
     * @param {GMConstructorCompilerJob} job
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
