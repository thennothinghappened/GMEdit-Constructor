import { getCurrentProject } from '../utils/editor.js';
import { CompileLogViewer } from '../editors/CompileLogViewer.js';
import { Job } from './Job.js';
import { igor_platform_cmd_name } from '../utils/igor.js';
import { Err } from '../utils/Err.js';

/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */
export class CompileController {

    /** @type {import('node:child_process').spawn} */
    #spawn;

    /** @type {Job[]} */
    #jobs = [];

    /**
     * @param {import('node:child_process').spawn} spawn
     */
    constructor(spawn) {

        this.#spawn = spawn;

    }

    /**
     * Select the flags for Igor to run the job.
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {IgorSettings} settings
     * @returns {Result<string[]>}
     */
    #getFlagsForJob(project, runtime_path, settings) {
        const flags = [
            `/project=${project.path}`,
            `/config=${project.config}`,
            `/rp=${runtime_path}`
        ];

        switch (settings.verb) {
            case 'Run':
            case 'Package':
            case 'Clean':
                break;

            default:
                return {
                    ok: false,
                    err: new Err(`Unhandled command case for flags: ${settings.verb}`)
                }
        }

        flags.push(igor_platform_cmd_name, settings.verb);

        return {
            ok: true,
            data: flags
        };
    }
   
    /**
     * Run a new job on a given project.
     * @param {GMLProject} project
     * @param {RuntimeInfo} runtime
     * @param {IgorSettings} settings
     * @returns {Result<Job>}
     */
    runJob(project, runtime, settings) {

        const flags_res = this.#getFlagsForJob(project, runtime.path, settings);

        if (!flags_res.ok) {
            return {
                ok: false,
                err: new Err('Failed to get Igor flags for this job!', flags_res.err)
            }
        }

        const proc = this.#spawn(
            runtime.igor_path,
            flags_res.data,
            { cwd: project.dir }
        );

        const job = new Job(settings, proc, project);
        this.#jobs.push(job);

        job.on('stop', () => {
            this.#removeJob(job);
        });

        return {
            ok: true,
            data: job
        };

    }

    /**
     * Remove a job from our tracked list.
     * @param {Job} job
     */
    #removeJob(job) {
        this.#jobs.splice(this.#jobs.indexOf(job), 1);
    }

    /**
     * Create a new editor instance for a given job.
     * @param {Job} job
     * @param {Boolean} reuse Whether to reuse an existing tab.
     */
    openEditorForJob(job, reuse) {
        CompileLogViewer.view(job, reuse);
    }

    cleanup() {
        this.#jobs.forEach(job => job.stop());
    }
}
