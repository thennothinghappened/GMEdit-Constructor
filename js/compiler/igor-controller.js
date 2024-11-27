/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */

import { OutputLogTab } from '../ui/tabs/compile/OutputLogTab.js';
import { Job } from './job/Job.js';
import { igor_platform_cmd_name, output_blob_exts, output_package_exts } from './igor-paths.js';
import { Err } from '../utils/Err.js';
import { child_process, path } from '../utils/node/node-import.js';

/** @type {Job[]} */
const jobs = [];

/**
 * Run a new job on a given project.
 * 
 * @param {GMEdit.Project} project
 * @param {RuntimeInfo} runtime
 * @param {UserInfo?} user
 * @param {IgorSettings} settings
 * @returns {Promise<Result<Job>>}
 */
export async function job_run(project, runtime, user, settings) {

	const flags_res = job_flags_get(project, runtime.path, user?.path ?? null, settings);

	if (!flags_res.ok) {
		return {
			ok: false,
			err: new Err('Failed to get Igor flags for this job!', flags_res.err)
		}
	}

	const proc = child_process.spawn(
		runtime.igor_path,
		flags_res.data,
		{ cwd: project.dir }
	);

	const job = new Job(settings, proc, project);
	jobs.push(job);

	job.on('stop', () => {
		job_remove(job);
	});

	return {
		ok: true,
		data: job
	};

}

/**
 * Create a new editor instance for a given job.
 * @param {Job} job
 * @param {Boolean} reuse Whether to reuse an existing tab.
 */
export function job_open_editor(job, reuse) {
	OutputLogTab.view(job, reuse);
}

/**
 * Remove a job from our tracked list.
 * @param {Job} job
 */
function job_remove(job) {
	jobs.splice(jobs.indexOf(job), 1);
}

/**
 * Select the flags for Igor to run the job.
 * @param {GMEdit.Project} project
 * @param {string} runtime_path
 * @param {string?} user_path
 * @param {IgorSettings} settings
 * @returns {Result<string[]>}
 */
function job_flags_get(project, runtime_path, user_path, settings) {

	const projectName = project.displayName;

	const flags = [
		`/project=${project.path}`,
		`/config=${settings.configName}`,
		`/rp=${runtime_path}`,
		`/runtime=${settings.runner}`,
		`/v`,
		`/cache=${path.join(settings.buildPath, 'cache')}`,
		'/of=' + path.join(settings.buildPath, 'output', projectName + output_blob_exts[settings.platform])
	];

	if (user_path !== null) {
		flags.push(`/uf=${user_path}`);
	}

	// ignore cache, this fixes changes not applying in yyc
	if (settings.runner === 'YYC') {
		flags.push('/ic');
	}

	switch (settings.verb) {

		case 'Package':

			if (['Windows', 'Mac'].includes(igor_platform_cmd_name)) {
				settings.verb = 'PackageZip';
			}

		break;

		case 'Run':
		break;

		case 'Clean':
		break;

		default:
			return {
				ok: false,
				err: new Err(`Unhandled command case for flags: ${settings.verb}`)
			}
	}

	flags.push('--');
	flags.push(igor_platform_cmd_name, settings.verb);

	return {
		ok: true,
		data: flags
	};
}

export function __cleanup__() {
	jobs.forEach(job => job.stop());
}
