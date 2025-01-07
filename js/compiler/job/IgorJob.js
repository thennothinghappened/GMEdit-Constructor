import { ControlPanelTab } from '../../ui/tabs/control-panel/ControlPanelTab.js';
import { Err } from '../../utils/Err.js';
import { EventEmitterImpl } from '../../utils/EventEmitterImpl.js';
import { child_process, path } from '../../utils/node/node-import.js';
import { killRecursive } from '../../utils/node/process-handling.js';
import { job_parse_stdout } from './output-parsing/parse-stdout.js';

/**
 * Wrapper for an Igor job.
 */
export class IgorJob {

	/** 
	 * Identifier number of this job. This value is incremented from `0` and is the lowest available
	 * integer at the time the job was begun.
	 * 
	 * @type {number} 
	 */
	id;

	/** @type {IgorSettings} */
	settings;

	/** @type {import('node:child_process').ChildProcess} */
	process;
	
	/** @type {GMEdit.Project} */
	project;

	stdout = '';

	/** @type {JobStatus} */
	state = { status: 'running' };

	/**
	 * @private
	 * @type {EventEmitterImpl<JobEventMap>}
	 */
	eventEmitter = new EventEmitterImpl(['stdout', 'output', 'stop']);

	/**
	 * @returns {EventEmitter<JobEventMap>}
	 */
	get events() {
		return this.eventEmitter;
	}
	
	/**
	 * @param {number} id
	 * @param {IgorSettings} settings
	 * @param {import('node:child_process').ChildProcess} process
	 * @param {GMEdit.Project} project
	 */
	constructor(id, settings, process, project) {
		
		this.id = id;
		this.settings = settings;
		this.process = process;
		this.project = project;

		this.stdout += this.process.spawnargs.join(' ') + '\n\n';

		this.process.once('exit', this.onProcessExit);
		this.process.stdout?.on('data', this.#onStdoutData);
		this.process.stderr?.on('data', this.#onStdoutData);

	}

	/**
	 * @param {any?} chunk
	 */
	#onStdoutData = (chunk) => {

		const str = chunk
			.toString()
			.replaceAll(/\r/g, '');
		
		this.stdout += str;
		this.eventEmitter.emit('stdout', this.stdout);

	}

	/**
	 * @private
	 */
	onProcessExit = () => {

		switch (this.state.status) {

			case 'running':

				this.state = {
					status: 'stopped',
					stopType: (this.process.exitCode ?? 0 > 0) ? 'Failed' : 'Finished',
					exitCode: this.process.exitCode ?? undefined
				};

			break;

			case 'stopping':

				this.state = {
					status: 'stopped',
					stopType: 'Stopped'
				};

			break;
			
		}
		
		this.eventEmitter.emit('stop', job_parse_stdout(this.stdout));
		this.process.removeAllListeners();
		
	}

	/**
	 * Stop the job. Returns a promise that resolves when the job has stopped.
	 * 
	 * @returns {Promise<void>}
	 */
	stop = () => {

		if (this.state.status !== 'running' || this.process.pid === undefined) {
			return Promise.resolve();
		}

		this.state = { status: 'stopping' };

		/** @type {Promise<void>} */
		const onStopPromise = new Promise(resolve => {
			this.events.once('stop', () => resolve());
		});

		const res = killRecursive(this.process.pid);
		
		if (!res.ok) {
			ControlPanelTab.error(
				`Failed to stop the job ${this.settings.verb}!`,
				res.err
			);
		}

		if (process.platform !== 'darwin') {
			return onStopPromise;
		}

		// Time for some MacOS-induced fuckery!
		// 
		// The game runner, on MacOS, detaches itself in every possible manner from Igor, and thus,
		// from us in GMEdit.
		// 
		// Due to this, there is no sound way to track down this process to kill it as well.
		// Hell, the IDE threw in the towel, and if you try and run two games at once from different
		// IDEs, you'll notice that hitting "Stop" on one kills the other.
		// 
		// We're taking a *slightly* more elegant and less annoying approach, by taking a guess that
		// the only programs whose command lines contain a specific debug output log that Igor tells
		// the runner to write STDOUT to, is going to be the runner, or anything else affiliated
		// with this compile, and kill these processes.

		const debug_log_path = path.join(this.settings.buildPath, 'output', 'debug.log');

		try {

			child_process.spawnSync('pgrep', ['-f', debug_log_path])
				.stdout
				.toString('utf-8')
				.split('\n')
				.map(parseInt)
				.filter(it => !isNaN(it))
				.forEach(it => killRecursive(it));

		} catch (err) {
			ControlPanelTab.error(
				`Failed to stop the job ${this.settings.verb}!`,
				new Err('Failed stopping MacOS-specific residual processes', err)
			);
		}

		return onStopPromise;

	}

}
