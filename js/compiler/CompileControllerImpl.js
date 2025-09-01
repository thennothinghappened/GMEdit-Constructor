/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */

import { IgorJob } from './job/IgorJob.js';
import { HOST_PLATFORM, output_blob_exts } from './igor-paths.js';
import { InvalidStateErr, SolvableError } from '../utils/Err.js';
import { child_process } from '../utils/node/node-import.js';
import { Err, Ok } from '../utils/Result.js';
import { docString } from '../utils/StringUtils.js';

/**
 * Real implementation of the compile controller, spawning Igor tasks.
 * 
 * @implements {GM.CompileController}
 */
export class CompileControllerImpl {

	/**
	 * @type {IgorJob[]}
	 * @private
	 */
	jobs = [];

	/**
	 * @param {GMEdit.Project} project
	 * @param {DiskIO} diskIO 
	 */
	constructor(project, diskIO) {
		/** @private */
		this.project = project;

		/** @private */
		this.diskIO = diskIO;
	}

	async destroyAsync() {
		await this.stopAll();
		this.jobs.length = 0;
	}

	/**
	 * Run a new job on a given project.
	 * 
	 * @param {GMS2.RuntimeInfo} runtime
	 * @param {GM.User} user
	 * @param {GMS2.IgorSettings} settings
	 * @param {number|undefined} [id] Specific ID to use for this job, for stealing from an existing one.
	 * @returns {Promise<Result<IgorJob>>}
	 */
	async start(runtime, user, settings, id = this.getNewJobId()) {
		if (settings.device === undefined && this.requiresRemoteDevice(settings.task, settings.platform)) {
			// TODO: use a union error type for passing this upwards to show the user a better message.
			// Error descriptiveness isn't as good at this level.
			return Err(new SolvableError(
				docString(`
					To build for ${settings.platform}, you need to pick a remote device to
					execute the process on. 
				`),
				docString(`
					Add a remote device in the IDE, and reload Constructor to pick it up.
				`)
			));
		}

		const idString = id.toString();
		settings.buildPath = this.diskIO.joinPath(settings.buildPath, settings.platform, idString);

		if (!(await this.diskIO.readDir(settings.buildPath)).ok) {
			
			const res = await this.diskIO.createDir(settings.buildPath, true);
			
			if (!res.ok) {
				return Err(new SolvableError(
					'Failed to create the build directory for project output!',
					docString(`
						Ensure the path '${settings.buildPath}' is valid, and that GMEdit would have
						permission to edit files and directories there.
					`),
					res.err
				));
			}

		}
		
		const flags = this.getFlagsForJobSettings(runtime.path, user, settings);

		const existingJob = this.jobs[id];
		await existingJob?.stop();

		/** @type {import('node:child_process').SpawnOptionsWithoutStdio} */
		const spawn_opts = {
			cwd: this.project.dir,
			detached: (process.platform !== 'win32')
		};
		
		/** @type {import('node:child_process').ChildProcessWithoutNullStreams} */
		let proc;
		/** @type {Date} */
		let startTime;

		try {
			proc = child_process.spawn(runtime.igorPath, flags, spawn_opts);
			
			startTime = await new Promise((resolve, reject) => {
				proc.once('spawn', () => resolve(new Date()));
				proc.once('error', reject);
			});
		} catch (err) {
			return Err(new InvalidStateErr('While trying to create the Igor process, the spawn() call failed unexpectedly', err));
		}
		
		const job = new IgorJob(id, settings, proc, this.project, startTime);
		
		this.jobs.push(job);
		job.events.once('stop', () => this.removeJob(job));

		return Ok(job);
	}

	/**
	 * Stop all currently running jobs.
	 * 
	 * @returns {Promise<void>} Promise that resolves when all jobs have stopped.
	 */
	async stopAll() {
		await Promise.all(this.jobs.map(job => job.stop()));
	}

	/**
	 * Select the flags for Igor to run the job.
	 * 
	 * @private
	 * @param {string} runtime_path
	 * @param {GM.User} user
	 * @param {GMS2.IgorSettings} settings
	 * @returns {string[]}
	 */
	getFlagsForJobSettings(runtime_path, user, settings) {

		const projectName = this.project.displayName;
		const blob_extension = output_blob_exts[settings.platform];

		const flags = [
			'/project=' + this.project.path,
			'/config=' + settings.configName,
			'/rp=' + runtime_path,
			'/runtime=' + settings.runtimeType,
			'/cache=' + this.diskIO.joinPath(settings.buildPath, 'cache'),
			'/of=' + this.diskIO.joinPath(settings.buildPath, 'output', `${projectName}.${blob_extension}`),
			`/uf=${user.fullPath}`,
			'/v'
		];

		// ignore cache, this fixes changes not applying in yyc
		if (settings.runtimeType === 'YYC') {
			flags.push('/ic');
		}

		if (settings.threads !== undefined) {
			flags.push(`/j=${settings.threads}`);
		}

		if (settings.device !== undefined) {
			flags.push(
				`/df=${settings.device.filePath}`,
				`/device=${settings.device.name}`
			);
		}

		/** @type {string} */
		let igorVerb = settings.task;

		switch (settings.platform) {
			case 'HTML5':
				if (settings.task === 'Package') {
					igorVerb = 'folder';
				}
			break;

			case 'Windows':
			case 'Mac':
				if (settings.task === 'Package') {
					igorVerb = 'PackageZip';
				}
			break;
		}

		flags.push('--');
		flags.push(settings.platform, igorVerb);

		return flags;
	}

	/**
	 * Check whether the given target platform requires a remote device to build to for the given task.
	 * 
	 * @private
	 * @param {GM.SupportedPlatform} platform 
	 * @param {GM.Task} task 
	 * @returns {boolean}
	 */
	requiresRemoteDevice(task, platform) {
		if (platform === HOST_PLATFORM) {
			return false;
		}

		switch (platform) {
			case 'Mac': return true;
			case 'Linux': return true;
			case 'Android': return task !== 'Package';
		}

		return false;
	}

	/**
	 * Remove a job from our tracked list.
	 * 
	 * @private
	 * @param {IgorJob} job
	 */
	removeJob(job) {
		this.jobs.splice(this.jobs.indexOf(job), 1);
	}

	/**
	 * Retrieve a unique ID number for a job to be created. This value increments from `0`, and is the
	 * lowest integer that is not currently in use by any other job.
	 * 
	 * This ID system exists for one purpose only: to differentiate parallel-running jobs when the user
	 * executes multiple at once, so that they have different directories to one another. Initially,
	 * using GUIDs was considered - similar to what the IDE does, but this would mean that manual
	 * clean-up of the job folder would be necessary occasionally or it would grow infinitely.
	 * 
	 * @private
	 * @returns {number}
	 */
	getNewJobId() {
		let id = 0;

		while (this.jobs.some(job => job.id === id)) {
			id ++;
		}

		return id;
	}

}
