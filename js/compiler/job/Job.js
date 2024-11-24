import { job_parse_stdout } from './output-parsing/parse-stdout.js';

/**
 * Wrapper for an Igor job.
 */
export class Job {

	/** @type {IgorSettings} */
	settings;

	/** @type {import('node:child_process').ChildProcess} */
	process;
	
	/** @type {GMEdit.Project} */
	project;

	stdout = '';

	/** @type {JobStatus} */
	status = { status: 'running' };

	statusDisplay = '';

	/**
	 * @private
	 * @type {{[key in JobEvent]: Set<(data: any?) => void>}} 
	 */
	listeners = {
		stdout: new Set(),
		output: new Set(),
		stop: new Set()
	};
	
	/**
	 * @param {IgorSettings} settings
	 * @param {import('node:child_process').ChildProcess} process
	 * @param {GMEdit.Project} project
	 */
	constructor(settings, process, project) {
		
		this.settings = settings;
		this.process = process;
		this.project = project;

		this.stdout += this.process.spawnargs.join(' ') + '\n\n';

		this.process.once('exit', this.#onExit);
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

		Job.notify(this.listeners.stdout, this.stdout);

	}

	#onExit = () => {

		if (this.status.status === 'running') {
			this.status = {
				status: 'stopped',
				stoppedByUser: false,
				exitCode: this.process.exitCode
			};
		}

		if (this.status.stoppedByUser) {
			this.statusDisplay = 'Stopped';
		} else if (this.status.exitCode ?? 0 > 0) {
			this.statusDisplay = 'Failed';
		} else {
			this.statusDisplay = 'Finished';
		}
		
		Job.notify(this.listeners.stop, job_parse_stdout(this.stdout));
		this.process.removeAllListeners();
		
	}

	/**
	 * @private
	 * @param {Set<(data?: any) => void>} listeners
	 * @param {any} [data]
	 */
	static notify = (listeners, data) => {
		for (const cb of listeners) {
			cb(data);
		}
	}

	/**
	 * Add an event listener for the given event.
	 * 
	 * @param {JobEvent} event
	 * @param {(data?: any) => void} callback
	 */
	on = (event, callback) => {
		this.listeners[event].add(callback);
	}

	/**
	 * Remove an event listener for the given event.
	 * 
	 * @param {JobEvent} event
	 * @param {(data?: any) => void} callback
	 */
	off = (event, callback) => {
		this.listeners[event].delete(callback);
	}

	/**
	 * Stop the job.
	 */
	stop = () => {
		
		this.status = {
			status: 'stopped',
			stoppedByUser: true,
			exitCode: 0
		};

		this.process.kill();

	}

	/**
	 * Returns a promise that resolves when this job is complete.
	 * @returns {Promise<void>}
	 */
	finished() {

		if (this.status.status === 'stopped') {
			return Promise.resolve();
		}

		return new Promise((res) => {
			this.on('stop', () => {
				res(undefined);
			});
		});

	}

}
