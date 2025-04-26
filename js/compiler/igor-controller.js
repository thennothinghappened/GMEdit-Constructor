/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */

import { IgorJob } from './job/IgorJob.js';
import { HOST_PLATFORM, output_blob_exts } from './igor-paths.js';
import { BaseError, SolvableError } from '../utils/Err.js';
import { child_process, path } from '../utils/node/node-import.js';
import { Err, Ok } from '../utils/Result.js';
import { mkdir, readdir } from '../utils/node/file.js';
import { docString } from '../utils/StringUtils.js';
import { GMRuntimeVersion, GMVersion } from './GMVersion.js';

/** @type {IgorJob[]} */
export const jobs = [];

/**
 * Run a new job on a given project.
 * 
 * @param {GMEdit.Project} project
 * @param {GMS2.RuntimeInfo} runtime
 * @param {GM.User} user
 * @param {GMS2.IgorSettings} settings
 * @param {number|undefined} [id] Specific ID to use for this job, for stealing from an existing one.
 * @returns {Promise<Result<IgorJob>>}
 */
export async function job_run(project, runtime, user, settings, id = job_create_id()) {

	if (settings.device === undefined && requiresRemoteDevice(settings.task, settings.platform)) {
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
	settings.buildPath = path.join(settings.buildPath, settings.platform, idString);

	if (!(await readdir(settings.buildPath)).ok) {
		
		const res = await mkdir(settings.buildPath, true);
		
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
	
	const flags_res = job_flags_get(project, runtime.path, user, settings);

	if (!flags_res.ok) {
		return Err(new BaseError('Failed to get Igor flags for this job!', flags_res.err));
	}

	const existingJob = jobs[id];
	await existingJob?.stop();

	/** @type {import('node:child_process').SpawnOptionsWithoutStdio} */
	const spawn_opts = {
		cwd: project.dir,
		detached: (process.platform !== 'win32')
	};

	const proc = child_process.spawn(runtime.igorPath, flags_res.data, spawn_opts);
	const job = new IgorJob(id, settings, proc, project);
	
	jobs.push(job);
	job.events.once('stop', () => job_remove(job));

	return Ok(job);

}

/**
 * Check whether the given target platform requires a remote device to build to for the given task.
 * 
 * @param {GM.SupportedPlatform} platform 
 * @param {GM.Task} task 
 * @returns {boolean}
 */
function requiresRemoteDevice(task, platform) {
	
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
 * Find an available runtime compatible with the given project version.
 * 
 * @param {GMS2.RuntimeProvider} runtimeProvider Method of listing available runtimes.
 * @param {GMVersion} projectVersion Version of the project we are tasked with matching against.
 * @param {GM.ReleaseChannel | undefined} [channel] The channel to query. If unspecified, all channels will be queried in order of specificity.
 * @returns {Result<GMS2.FindCompatibleRuntimeData, GMS2.FindCompatibleRuntimeError>}
 */
export function findCompatibleRuntime(runtimeProvider, projectVersion, channel) {

	if (channel !== undefined) {
		
		const runtimes = runtimeProvider.getRuntimes(channel);

		if (runtimes === undefined) {
			return Err({ type: 'channel-empty', channel });
		}

		const runtime = findCompatibleRuntimeInChannel(projectVersion, runtimes);

		if (runtime === undefined) {
			return Err({ type: 'none-compatible', channel });
		}

		return Ok({ runtime, channel });

	}

	// Beta runtimes use major versions of months, multiplied by 100. Thus, encountering this, we
	// know the project is on a beta build.
	if (projectVersion.month >= 100) {
		return findCompatibleRuntime(runtimeProvider, projectVersion, 'Beta');
	}

	/**
	 * The order to check in. Our order is based on the release frequency of the channels, as this
	 * also matches with their stability. We want to ideally pick the most-stable option, if there
	 * are multiple possible matches.
	 * 
	 * @type {GM.ReleaseChannel[]}
	 */
	const CHANNEL_QUERY_ORDER = ['LTS', 'Stable', 'Beta'];

	for (const channel of CHANNEL_QUERY_ORDER) {

		const result = findCompatibleRuntime(runtimeProvider, projectVersion, channel);

		if (result.ok) {
			return result;
		}

	}

	return Err({ type: 'none-compatible' });
	
}
/**
 * Find an available runtime compatible with the given project version in the given channel.
 * 
 * @param {GMVersion} projectVersion Version of the project we are tasked with matching against.
 * @param {NonEmptyArray<GMS2.RuntimeInfo>} runtimes List of runtimes in the channel.
 * @returns {GMS2.RuntimeInfo|undefined}
 */
function findCompatibleRuntimeInChannel(projectVersion, runtimes) {

	for (const runtime of [...runtimes].sort((a, b) => b.version.compare(a.version))) {
		
		if (runtime.version.year !== projectVersion.year) {
			continue;
		}

		if (runtime.version.month !== projectVersion.month) {
			continue;
		}

		if (runtime.version.revision !== projectVersion.revision) {
			continue;
		}

		return runtime;

	}

	return undefined;

}

/**
 * Remove a job from our tracked list.
 * @param {IgorJob} job
 */
function job_remove(job) {
	jobs.splice(jobs.indexOf(job), 1);
}

/**
 * Select the flags for Igor to run the job.
 * 
 * @param {GMEdit.Project} project
 * @param {string} runtime_path
 * @param {GM.User} user
 * @param {GMS2.IgorSettings} settings
 * @returns {Result<string[]>}
 */
function job_flags_get(project, runtime_path, user, settings) {

	const projectName = project.displayName;
	const blob_extension = output_blob_exts[settings.platform];

	const flags = [
		'/project=' + project.path,
		'/config=' + settings.configName,
		'/rp=' + runtime_path,
		'/runtime=' + settings.runtimeType,
		'/cache=' + path.join(settings.buildPath, 'cache'),
		'/of=' + path.join(settings.buildPath, 'output', `${projectName}.${blob_extension}`),
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

	return Ok(flags);
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
 * @returns {number}
 */
function job_create_id() {
	
	let id = 0;

	while (jobs.some(job => job.id === id)) {
		id ++;
	}

	return id;

}

export function __cleanup__() {
	jobs.forEach(job => job.stop());
}
