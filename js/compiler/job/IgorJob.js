import { delay } from '../../utils/delay.js';
import { BaseError } from '../../utils/Err.js';
import { EventEmitterImpl } from '../../utils/EventEmitterImpl.js';
import { child_process, path } from '../../utils/node/node-import.js';
import { killRecursive } from '../../utils/node/process-handling.js';
import { Err, Ok } from '../../utils/Result.js';
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

	/** @type {GMS2.IgorSettings} */
	settings;

	/** @type {import('node:child_process').ChildProcess} */
	process;
	
	/** @type {GMEdit.Project} */
	project;

	/**
	 * When the job was started.
	 * @type {Date}
	 */
	startTime;

	stdout = '';

	/** @type {JobState} */
	state = { status: 'running' };

	/**
	 * @private
	 * @type {EventEmitterImpl<JobEventMap>}
	 */
	eventEmitter = new EventEmitterImpl(['stdout', 'output', 'stopping', 'stop']);

	/**
	 * @returns {EventEmitter<JobEventMap>}
	 */
	get events() {
		return this.eventEmitter;
	}

	/**
	 * A promise that resolves upon completion of this job.
	 * 
	 * @readonly
	 * @type {Promise<JobEventMap['stop']>}
	 */
	complete = new Promise(resolve => this.events.once('stop', resolve));
	
	/**
	 * @param {number} id
	 * @param {GMS2.IgorSettings} settings
	 * @param {import('node:child_process').ChildProcess} process
	 * @param {GMEdit.Project} project
	 * @param {Date} startTime
	 */
	constructor(id, settings, process, project, startTime) {
		
		this.id = id;
		this.settings = settings;
		this.process = process;
		this.project = project;
		this.startTime = startTime;

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
		
		this.eventEmitter.emit('stop', {
			stopType: this.state.stopType,
			exitCode: this.state.exitCode,
			errors: job_parse_stdout(this.stdout),
		});

		this.process.removeAllListeners();
		
	}

	/**
	 * Stop the job. Returns a promise that resolves when the job has stopped.
	 * 
	 * @returns {Promise<Result<JobEventMap['stop'], BaseError>>}
	 */
	stop = async () => {

		const MAX_WAIT_MS = 2000;

		if (this.state.status === 'stopped') {
			return Ok(await this.complete);
		}

		if (this.state.status === 'stopping') {
			// Force-kill on subsequent calls.
			return this.forceStop();
		}

		this.state = { status: 'stopping' };
		this.eventEmitter.emit('stopping', undefined);

		const killResult = await this.killProcesses(false);

		if (!killResult.ok) {
			return killResult;
		}

		const stopInfo = await Promise.race([this.complete, delay(MAX_WAIT_MS)]);

		if (stopInfo !== undefined) {
			return Ok(stopInfo);
		}

		// Force-kill after the timeout expires.
		return this.forceStop();

	}

	/**
	 * @private
	 * @returns {Promise<Result<JobEventMap['stop'], BaseError>>}
	 */
	async forceStop() {
		const forceKillResult = await this.killProcesses(true);

		if (!forceKillResult.ok) {
			return forceKillResult;
		}

		return Ok(await this.complete);
	}

	/**
	 * @private
	 * @param {boolean} force 
	 * @returns {Promise<Result<void>>}
	 */
	async killProcesses(force) {

		const pid = this.process.pid;

		switch (process.platform) {

			case 'win32':

				if (this.settings.platform === 'Android') {

					// Windows has no interest in closing processes unless you force it to (`/F`).
					// 
					// This is annoying because Gradle does not close properly and will hold open
					// file handles from beyond the grave, and thus prevent us from reusing
					// directories, and the Gradle daemon keeps living on, sapping our memory.
					// 
					// I don't know any good way to *JUST* close the Gradle daemon associated with
					// the project that doesn't require circumstances such as the user being an
					// administrator so that they can query what processes hold a file handle.
					// 
					// Thus, we're forced to do what the IDE does, and murder every single instance
					// of Gradle running on the system, because this is the only option Gradle
					// offers, and Gradle's developers apparently see no reason for you to want to
					// do anything else.
					// 
					// Perhaps this is a hidden suggestion to stop all usage of Gradle.
					// (Whilst I am just making fun here, I *am* serious in how little I like Gradle!)

					const gradlewPath = path.join(
						this.settings.buildPath,
						'cache',
						'Android',
						this.settings.configName,
						'gradle',
						'gradlew.bat'
					);

					await new Promise(resolve => child_process
						.spawn(gradlewPath, ['--stop'], { shell: true })
						.once('exit', resolve)
					);

				}

				if (pid !== undefined) {
					return killRecursive(pid, true);
				}

			break;

			case 'darwin':

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

					const proc = child_process.spawn('pgrep', ['-f', debug_log_path]);

					let output = '';
					proc.stdout.on('data', chunk => { output += chunk.toString('utf-8'); });

					await new Promise(resolve => proc.once('exit', resolve));

					output
						.split('\n')
						.map(parseInt)
						.filter(it => !isNaN(it))
						.forEach(it => killRecursive(it, force));

				} catch (err) {
					return Err(new BaseError(
						'Failed stopping MacOS-specific residual processes',
						err
					));
				}

			break;

			case 'linux':
				if (pid !== undefined) {
					return killRecursive(pid, force);
				}
			break;
			
		}
		
		return { ok: true };

	}

}
