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
		return `${job.project.displayName} - ${job.settings.verb}${statusDisplay}`;
	}

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class CompileLogViewer extends ConstructorEditorView {

	static fileKind = new KConstructorOutput();
	static scrollGrabLines = 5;

	/** @type {Job} */
	job;

	/** @type {UIGroup} */
	infoGroup;

	/** @type {HTMLPreElement} */
	logText;

	/** @type {AceAjax.Editor} */
	logAceEditor;

	/** @type {UIGroup} */
	errorsGroup;

	/** The saved X-position of the log to return to on restoring the UI. */
	savedScrollX = 0;
	/** The saved Y-position of the log to return to on restoring the UI. */
	savedScrollY = 0;

	/**
	 * @param {GmlFile} file
	 * @param {Job} job
	 */
	constructor(file, job) {

		super(file);
		
		this.job = job;

		this.uiCreate();
		this.startWatchingJob();

	}

	/**
	 * Start watching the job this viewer is assigned to.
	 */
	startWatchingJob = () => {

		this.job.on('stdout', (/** @type {string} */ content) => {

			const cursor = this.logAceEditor.getCursorPosition();
			const end_row = this.logAceEditor.session.doc.getLength();
			const should_scroll = (cursor.row >= (end_row - CompileLogViewer.scrollGrabLines));

			this.logAceEditor.session.setValue(content);
			this.logAceEditor.moveCursorToPosition(cursor);

			if (should_scroll) {
				this.goToBottom();
			}

		});

		this.job.on('stop', (/** @type {Array<JobError>} */ errors) => {

			const job_name = KConstructorOutput.getJobName(this.job);

			this.infoGroup.legend.childNodes[0].textContent = job_name;
			this.file.rename(job_name, '');

			if (errors.length > 0) {

				for (const error of errors) {
					error.displayHTML(this.errorsGroup);
				}
				
				this.errorsGroup.hidden = false;
				this.errorsGroup.classList.remove('collapsed');

				this.logAceEditor.resize();
				this.goToBottom();
				
			}

		});

	}

	/**
	 * Setup the page UI.
	 */
	uiCreate() {

		this.element.innerHTML = '';
		this.element.classList.add('gm-constructor-viewer', 'popout-window');

		this.infoGroup = ui.group(this.element, KConstructorOutput.getJobName(this.job), [
			ui.text_button('Stop', this.stopJob),
			ui.text_button('Go to bottom', this.goToBottom)
		]);
		this.infoGroup.classList.add('gm-constructor-viewer-output');
		
		this.logText = document.createElement('pre');
		this.logText.className = 'gm-constructor-log';

		this.infoGroup.addEventListener('scroll', () => {
			this.savedScrollX = this.infoGroup.scrollTop;
			this.savedScrollY = this.infoGroup.scrollLeft;
		});

		this.infoGroup.appendChild(this.logText);
		this.logAceEditor = GMEdit.aceTools.createEditor(this.logText, {
			statusBar: false
		});
		this.logAceEditor.setReadOnly(true);

		this.errorsGroup = ui.group(this.element, 'Errors');
		this.errorsGroup.classList.add('gm-constructor-viewer-errors');
		this.errorsGroup.classList.add('collapsed');
		this.errorsGroup.legend.addEventListener('click', () => this.logAceEditor.resize());
		this.errorsGroup.hidden = true;

	}

	/**
	 * Restore the log scroll position when tabbing back in.
	 */
	onSelectEditor = () => {
		this.infoGroup.scrollTop = this.savedScrollX;
		this.infoGroup.scrollLeft = this.savedScrollY;
	}

	/**
	 * Set up an editor tab for a Job, and view it.
	 * @param {Job} job
	 * @param {Boolean} reuse Whether to reuse an existing tab.
	 * @returns {void}
	 */
	static view = (job, reuse) => {

		if (!reuse) {

			const file = new GmlFile(KConstructorOutput.getJobName(job), null, this.fileKind, job);
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
		
		viewer.job = job;
		viewer.uiCreate();
		viewer.startWatchingJob();
		
		return viewer.focus();

	}

	/**
	 * Go the the bottom of the log.
	 */
	goToBottom = () => {
		this.logAceEditor.navigateFileEnd();
		this.logAceEditor.scrollToLine(this.logAceEditor.session.getLength(), false, false, () => {});
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
		this.logAceEditor.destroy();
	}
}
