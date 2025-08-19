import { IgorJob } from '../../compiler/job/IgorJob.js';
import { use } from '../../utils/scope-extensions/use.js';

const PreferencesUI = $gmedit['ui.Preferences'];

/**
 * @implements {UI.OutputLogDisplay.Client}
 */
export class JobOutputLog {
	/**
	 * @private
	 */
	static scrollGrabLines = 1;

	/**
	 * @type {JobOutputLog[]}
	 */
	static instances = [];

	/**
	 * @private
	 */
	content = new DocumentFragment();

	/**
	 * @private
	 * @type {HTMLHeadingElement}
	 */
	jobNameHeading = document.createElement('h4');

	/**
	 * Ace instance which shows log output.
	 * 
	 * @private
	 * @type {AceAjax.Editor}
	 */
	logAceEditor = use(document.createElement('pre'))
		.also(it => it.classList.add('gm-constructor-log'))
		.let(it => GMEdit.aceTools.createEditor(it, { 
			statusBar: false,
			tooltips: false,
			completers: false,
			linter: false
		}))
		.also(it => it.setReadOnly(true))
		.also(it => it.setOption('scrollPastEnd', 0))
		.also(it => it.renderer.setShowGutter(false))
		.also(it => it.renderer.setShowPrintMargin(false))
		.value;

	/**
	 * @private
	 * @param {IgorJob} job 
	 * @param {UI.OutputLogDisplay} display 
	 */
	constructor(job, display) {
		this.job = job;
		this.display = display;

		this.updateTitle();

		const header = document.createElement('header');
		header.appendChild(this.jobNameHeading);

		const navButtonsGroup = document.createElement('nav');
		PreferencesUI.addButton(navButtonsGroup, 'Stop', this.stopJob);
		PreferencesUI.addButton(navButtonsGroup, 'Go to bottom', this.goToBottom);
		PreferencesUI.addButton(navButtonsGroup, 'Show directory', this.showDirectory);
		header.appendChild(navButtonsGroup);
		
		this.content.appendChild(header);
		this.content.appendChild(this.logAceEditor.container);

		/** @private */
		this.jobEventGroup = job.events.createGroup({
			stdout: this.onJobStdout,
			stop: this.onJobStop,
			stopping: this.updateTitle
		});

		/** @private */
		this.tickIntervalId = setInterval(this.updateTitle, 1000);
	}

	destroy() {
		const instanceIndex = JobOutputLog.instances.indexOf(this);

		if (instanceIndex < 0) {
			return;
		}

		JobOutputLog.instances.splice(instanceIndex, 1);
		clearInterval(this.tickIntervalId);

		this.jobEventGroup.destroy();
		this.job.stop();

		this.logAceEditor.destroy();
	}

	getContent() {
		return this.content;
	}

	displayResized() {
		const followOutput = this.shouldFollowOutput();
		this.logAceEditor.resize();

		if (followOutput) {
			this.goToBottom();
		}
	}

	displayClosed() {
		// Currently we can't move a client from one display to another, so display hang up means
		// the job should end.
		this.destroy();
	}

	/**
	 * Go the the bottom of the log.
	 * @private
	 */
	goToBottom = () => {
		this.logAceEditor.navigateFileEnd();
		this.logAceEditor.scrollToLine(this.logAceEditor.session.getLength(), false, false, () => {});
	}

	/**
	 * Check whether we should be following the output downwards.
	 * 
	 * @private
	 * @returns {boolean}
	 */
	shouldFollowOutput() {
		const endRow = this.logAceEditor.session.doc.getLength();
		return (this.logAceEditor.renderer.getScrollBottomRow() >= (endRow - JobOutputLog.scrollGrabLines));
	}

	stopJob = () => {
		if (this.job === undefined) {
			return;
		}

		if (this.job.state.status === 'running') {
			this.job.stop();
		}
	}

	/**
	 * Callback on updates to the output of the attached Job.
	 * 
	 * @private
	 * @param {string} content The content of the Job's STDOUT.
	 */
	onJobStdout = (content) => {
		const followOutput = this.shouldFollowOutput();
		const cursor = this.logAceEditor.getCursorPosition();
		
		this.logAceEditor.session.setValue(content);
		this.logAceEditor.moveCursorToPosition(cursor);

		if (followOutput) {
			this.goToBottom();
		}
	}

	/**
	 * Callback on the completion of the attached Job.
	 * 
	 * @private
	 * @param {JobEventMap['stop']} event
	 */
	onJobStop = ({ errors }) => {
		clearInterval(this.tickIntervalId);
		this.updateTitle();

		if (errors.length > 0) {
			errors.forEach(it => this.display.addError(it));

			this.logAceEditor.resize();
			this.goToBottom();
		}
	}

	/**
	 * Visit the output directory of the task.
	 */
	showDirectory = () => {
		Electron_Shell.showItemInFolder(this.job.settings.buildPath);
	}

	/**
	 * Job "tick" function called every second to update the status bar. Later we'll chuck in a
	 * timer for how long the job has been running.
	 * 
	 * @private
	 */
	updateTitle = () => {
		let title = `${this.job.settings.platform} ${this.job.settings.task}`;

		if (JobOutputLog.instances.length > 1) {
			title += ` #${this.job.id}`;
		}

		switch (this.job.state.status) {
			case 'running': break;
			case 'stopping': title +=  ': Stopping'; break;
			case 'stopped': title += `: ${this.job.state.stopType}`; break;
		}

		// TODO: Format time nicely here :)
		const duration = ((Date.now() - this.job.startTime.getTime()) / 1000).toString();

		if (this.display.supportsTitle()) {
			this.display.setTitle(title);
			this.jobNameHeading.textContent = `${duration} seconds`;
		} else {
			this.jobNameHeading.textContent = `${title} (${duration} seconds)`;
		}
	}

	get isRunning() {
		return this.job.state.status !== 'stopped';
	}

	/**
	 * 
	 * @param {IgorJob} job 
	 * @param {UI.OutputLogDisplay} display 
	 */
	static create(job, display) {
		const outputLog = new JobOutputLog(job, display);
		JobOutputLog.instances.push(outputLog);

		display.connect(outputLog);
	}

	/**
	 * Find a finished instance to steal its display.
	 * @returns {JobOutputLog|undefined}
	 */
	static findIdle() {
		return this.instances.find(it => !it.isRunning) ?? this.instances[0];
	}
}
