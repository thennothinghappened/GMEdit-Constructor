import { getCurrentProject } from '../utils.js';
import { CompileLogViewer } from './CompileLogViewer.js';
import { Job } from './Job.js';
import { igor_platform_cmd_name } from './igor.js';

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
     * @returns {string[]}
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
                throw `Unhandled command case for flags: ${settings.verb}`;
        }

        flags.push(igor_platform_cmd_name, settings.verb);

        return flags;
    }
   
    /**
     * Run a new job on a given project.
     * @param {GMLProject} project
     * @param {RuntimeInfo} runtime
     * @param {IgorSettings} settings
     * @returns {Result<Job, 'igor missing'>}
     */
    runJob(project, runtime, settings) {

        const proc = this.#spawn(
            runtime.igor_path,
            this.#getFlagsForJob(project, runtime.path, settings),
            { cwd: project.dir }
        );

        const job = new Job(settings, proc, project);
        this.#jobs.push(job);

        job.on('stop', () => {
            this.#removeJob(job);
        });

        return {
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
     */
    openEditorForJob(job) {
        CompileLogViewer.view(job);
    }

    cleanup() {
        this.#jobs.forEach(job => job.stop());
    }
}
