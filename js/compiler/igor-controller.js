/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */

import { IgorJob } from './job/IgorJob.js';
import { output_blob_exts } from './igor-paths.js';
import { Err } from '../utils/Err.js';
import { child_process, path } from '../utils/node/node-import.js';

/** @type {IgorJob[]} */
export const jobs = [];

/**
 * Run a new job on a given project.
 * 
 * @param {GMEdit.Project} project
 * @param {Zeus.RuntimeInfo} runtime
 * @param {UserInfo|undefined} user
 * @param {Zeus.IgorSettings} settings
 * @param {number|undefined} [id] Specific ID to use for this job, for stealing from an existing one.
 * @returns {Promise<Result<IgorJob>>}
 */
export async function job_run(project, runtime, user, settings, id = job_create_id()) {

	const id_string = id.toString();
	settings.buildPath = path.join(settings.buildPath, settings.platform, id_string);

	const flags_res = job_flags_get(project, runtime.path, user?.path, settings);

	if (!flags_res.ok) {
		return {
			ok: false,
			err: new Err('Failed to get Igor flags for this job!', flags_res.err)
		};
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

	return { ok: true, data: job };

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
 * @param {string|undefined} user_path
 * @param {Zeus.IgorSettings} settings
 * @returns {Result<string[]>}
 */
function job_flags_get(project, runtime_path, user_path, settings) {

	const projectName = project.displayName;
	const blob_extension = output_blob_exts[settings.platform];

	const flags = [
		'/project=' + project.path,
		'/config=' + settings.configName,
		'/rp=' + runtime_path,
		'/runtime=' + settings.runner,
		'/cache=' + path.join(settings.buildPath, 'cache'),
		'/of=' + path.join(settings.buildPath, 'output', `${projectName}.${blob_extension}`),
		'/v'
	];

	if (user_path !== undefined) {
		flags.push(`/uf=${user_path}`);
	}

	// ignore cache, this fixes changes not applying in yyc
	if (settings.runner === 'YYC') {
		flags.push('/ic');
	}

	switch (settings.verb) {

		case 'Package':

			if (['Windows', 'Mac'].includes(settings.platform)) {
				settings.verb = 'PackageZip';
			}

		break;

		case 'Run':
		break;

		default:
			return {
				ok: false,
				err: new Err(`Unhandled command case for flags: ${settings.verb}`)
			}
	}

	flags.push('--');
	flags.push(settings.platform, settings.verb);

	return {
		ok: true,
		data: flags
	};
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

	while (jobs.find(it => it.id === id) !== undefined) {
		id ++;
	}

	return id;

}

export function __cleanup__() {
	jobs.forEach(job => job.stop());
}
