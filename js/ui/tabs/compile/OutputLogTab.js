import { IgorJob } from '../../../compiler/job/IgorJob.js';
import { ConstructorTab, ConstructorTabFileKind } from '../ConstructorTab.js';
import * as ui from '../../ui-wrappers.js';
import { JobError } from '../../../compiler/job/JobError.js';
import { Err } from '../../../utils/Err.js';
import { use } from '../../../utils/scope-extensions/use.js';
import { GmlFileUtils } from '../../../utils/gmedit/GmlFileUtils.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * File type for a compile job.
 */
class OutputLogFileKind extends ConstructorTabFileKind {

	static inst = new OutputLogFileKind();

	constructor() {
		super();
		this.checkSelfForChanges = false;
	}

	/**
	 * @param {GMEdit.GmlFile} file
	 */
	init = (file) => {
		file.editor = new OutputLogTab(file);
	}

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class OutputLogTab extends ConstructorTab {
	
	/**
	 * @private
	 */
	static scrollGrabLines = 1;

	/** @type {IgorJob|undefined} */
	job = undefined;

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
	 */
	constructor(file) {

		super(file);

		use(this.element).also(it => {
			it.innerHTML = '';
			it.classList.add('gm-constructor-viewer', 'popout-window');
		});

		this.logAceEditor = use(document.createElement('pre'))
			.also(it => it.classList.add('gm-constructor-log'))
			.let(it => GMEdit.aceTools.createEditor(it, { statusBar: false, tooltips: false }))
			.also(it => it.setReadOnly(true))
			.also(it => it.setOption('scrollPastEnd', 0))
			.value;

		this.infoGroup = use(ui.group(this.element, this.file.name, [
			ui.text_button('Stop', this.stopJob),
			ui.text_button('Go to bottom', this.goToBottom),
			ui.text_button('Open directory', this.showDirectory)
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

	}

	/**
	 * Start watching the provided job.
	 * @param {IgorJob} job The job to watch.
	 */
	attach = (job) => {

		if (this.job !== null) {
			this.detach();
		}

		GmlFileUtils.rename(this.file, OutputLogTab.getJobName(job));
		this.infoGroup.legend.childNodes[0].textContent = this.file.name;
		
		this.logAceEditor.session.setValue('');
		
		this.errorsGroup
			.querySelectorAll(':scope > :not(legend)')
			.forEach(error => error.remove());

		this.errorsGroup.hidden = true;

		job.events.on('stdout', this.onJobStdout);
		job.events.on('stop', this.onJobStop);

		this.job = job;

	}

	/**
	 * Stop watching the job we're currently watching.
	 */
	detach = () => {
		
		if (this.job === undefined) {
			return;
		}

		this.job.events.off('stdout', this.onJobStdout);
		this.job.events.off('stop', this.onJobStop);

		this.job = undefined;

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
		const should_scroll = (this.logAceEditor.renderer.getScrollBottomRow() >= (end_row - OutputLogTab.scrollGrabLines));
		
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

		if (this.job === undefined) {
			return;
		}

		GmlFileUtils.rename(this.file, OutputLogTab.getJobName(this.job));
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
	 * Set up an editor tab for a Job, and view it.
	 * 
	 * @param {IgorJob} job
	 * @param {Boolean} reuse Whether to reuse an existing tab.
	 * @returns {void}
	 */
	static view = (job, reuse) => {

		if (!reuse) {
			
			const file = new GmlFile('Constructor Job', null, OutputLogFileKind.inst);
			GmlFile.openTab(file);

			const tab = /** @type {OutputLogTab} */ (file.editor);
			tab.attach(job);

			return;

		}

		const tabs = Array.from(ChromeTabs.getTabs());
		const editors = tabs.map(tab => tab.gmlFile.editor);

		/** @type {OutputLogTab|undefined} */
		const viewer = editors.find(editor => editor instanceof OutputLogTab);

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
		
		if (this.job === undefined) {
			return;
		}

		if (this.job.status.status !== 'stopped') {
			this.job.stop();
		}

	}

	/**
	 * Visit the output directory of the task.
	 */
	showDirectory = () => {

		if (this.job === undefined) {
			return;
		}

		Electron_Shell.showItemInFolder(this.job.settings.buildPath);
		
	}

	/**
	 * Called when closing the tab,
	 * for now we have it also kill the job, so it doesn't run
	 * on in the background.
	 */
	destroy = () => {

		if (this.job !== undefined) {
			this.stopJob();
			this.detach();
		}

		this.logAceEditor.destroy();

	}

	/**
	 * @private
	 * @param {IgorJob} job
	 */
	static getJobName = (job) => {

		if (job.statusDisplay === '') {
			return job.settings.verb;
		}

		return `${job.settings.verb}: ${job.statusDisplay}`;
	}

}
