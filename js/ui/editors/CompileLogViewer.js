import { Job } from '../../compiler/job/Job.js';
import { ConstructorEditorView, ConstructorViewFileKind } from './ConstructorEditorView.js';
import * as ui from '../ui-wrappers.js';
import { JobError } from '../../compiler/job/JobError.js';
import { Err } from '../../utils/Err.js';
import { use } from '../../utils/scope-extensions/use.js';

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
	 * @param {GMEdit.GmlFile} file
	 * @param {Job} job
	 */
	init = (file, job) => {
		file.editor = new CompileLogViewer(file, job);
	}

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends ConstructorEditorView {

	static fileKind = new KConstructorOutput();
	
	/**
	 * @private
	 */
	static scrollGrabLines = 5;

	/** @type {Job?} */
	job = null;

	/**
	 * @private
	 * @type {UIGroup}
	 */
	infoGroup;

	/**
	 * @private
	 * @type {AceAjax.Editor}
	 */
	logAceEditor;

	/**
	 * @private
	 * @type {UIGroup}
	 */
	errorsGroup;

	/**
	 * @param {GMEdit.GmlFile} file
	 * @param {Job} job
	 */
	constructor(file, job) {

		super(file);

		use(this.element).also(it => {
			it.innerHTML = '';
			it.classList.add('gm-constructor-viewer', 'popout-window');
		});

		this.logAceEditor = use(document.createElement('pre'))
			.also(it => it.classList.add('gm-constructor-log'))
			.let(it => window.GMEdit.aceTools.createEditor(it, { statusBar: false }))
			.also(it => it.setReadOnly(true))
			.value;

		this.infoGroup = use(ui.group(this.element, this.file.name, [
			ui.text_button('Stop', this.stopJob),
			ui.text_button('Go to bottom', this.goToBottom)
		])).also(it => {

			it.classList.add('gm-constructor-viewer-output');
			it.appendChild(this.logAceEditor.container);

		}).value;

		this.errorsGroup = use(ui.group(this.element, 'Errors'))
			.also(it => {
				it.classList.add('gm-constructor-viewer-errors');
				it.legend.addEventListener('click', () => this.logAceEditor.resize());
				it.hidden = true;
			})
			.value;

		this.attach(job);

	}

	/**
	 * Start watching the provided job.
	 * @param {Job} job The job to watch.
	 */
	attach = (job) => {

		if (this.job !== null) {
			this.detach();
		}

		this.file.rename(CompileLogViewer.getJobName(job), '');
		this.infoGroup.legend.childNodes[0].textContent = this.file.name;
		
		this.logAceEditor.session.setValue('');
		
		this.errorsGroup
			.querySelectorAll(':scope > :not(legend)')
			.forEach(error => error.remove());

		this.errorsGroup.hidden = true;

		job.on('stdout', this.onJobStdout);
		job.on('stop', this.onJobStop);

		this.job = job;

	}

	/**
	 * Stop watching the job we're currently watching.
	 */
	detach = () => {
		
		if (this.job === null) {
			return;
		}

		this.job.off('stdout', this.onJobStdout);
		this.job.off('stop', this.onJobStop);

		this.job = null;

	}

	/**
	 * Callback on updates to the output of the attached Job.
	 * 
	 * @private
	 * @param {string} content The content of the Job's STDOUT.
	 */
	onJobStdout = (content) => {

		const cursor = this.logAceEditor.getCursorPosition();
		const end_row = this.logAceEditor.session.doc.getLength();
		const should_scroll = (cursor.row >= (end_row - CompileLogViewer.scrollGrabLines));

		this.logAceEditor.session.setValue(content);
		this.logAceEditor.moveCursorToPosition(cursor);

		if (should_scroll) {
			this.goToBottom();
		}

	}

	/**
	 * Callback on the completion of the attached Job.
	 * 
	 * @private
	 * @param {Array<JobError>} errors List of errors produced by the Job.
	 */
	onJobStop = (errors) => {

		if (this.job === null) {
			return;
		}

		this.file.rename(CompileLogViewer.getJobName(this.job), '');
		this.infoGroup.legend.childNodes[0].textContent = this.file.name;

		if (errors.length > 0) {

			for (const error of errors) {
				error.displayHTML(this.errorsGroup);
			}
			
			this.errorsGroup.hidden = false;

			this.logAceEditor.resize();
			this.goToBottom();
			
		}

	}

	/**
	 * Restore the log scroll position when tabbing back in.
	 * @param {GMEdit.Editor} prev The editor that was previously in focus.
	 */
	focusGain(prev) {
		
		if (prev !== this) {
			// this.infoGroup.scrollTop = this.savedScrollX;
			// this.infoGroup.scrollLeft = this.savedScrollY;
		}
		
		return super.focusGain(prev);

	}

	/**
	 * Set up an editor tab for a Job, and view it.
	 * 
	 * @param {Job} job
	 * @param {Boolean} reuse Whether to reuse an existing tab.
	 * @returns {void}
	 */
	static view = (job, reuse) => {

		if (!reuse) {
			const file = new GmlFile(this.getJobName(job), null, this.fileKind, job);
			return GmlFile.openTab(file);
		}

		const tabs = Array.from(ChromeTabs.getTabs());
		const editors = tabs.map(tab => tab.gmlFile.editor);

		/** @type {CompileLogViewer|undefined} */
		// @ts-ignore
		const viewer = editors.find(editor => editor instanceof CompileLogViewer);

		if (viewer === undefined) {
			return this.view(job, false);
		}

		viewer.stopJob();
		viewer.detach();

		viewer.attach(job);

		return viewer.focus();

	}

	/**
	 * Go the the bottom of the log.
	 * @private
	 */
	goToBottom = () => {
		this.logAceEditor.navigateFileEnd();
		this.logAceEditor.scrollToLine(this.logAceEditor.session.getLength(), false, false, () => {});
	}

	stopJob = () => {
		
		if (this.job === null) {
			throw new Err('Attempting to stop a job that does not exist!');
		}

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

		if (this.job !== null) {
			this.stopJob();
			this.detach();
		}

		this.logAceEditor.destroy();

	}

	/**
	 * @private
	 * @param {Job} job
	 */
	static getJobName = (job) => {
		const statusDisplay = job.statusDisplay === '' ? '' : (': ' + job.statusDisplay);
		return `${job.project.displayName} - ${job.settings.verb}${statusDisplay}`;
	}

}
