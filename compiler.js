import { getCurrentProject } from './utils.js';
import { CompileLogViewer } from './viewer.js';
import { Job } from './job.js';

/** @type {{[key in NodeJS.Platform]: {ext: string, path_name: string, cmd: string}}} */
const igorPlatformMappings = {
    'win32': {
        ext: '.exe',
        path_name: 'windows',
        cmd: 'Windows'
    },
    'darwin': {
        ext: '',
        path_name: 'osx',
        cmd: 'Mac'
    },
    'linux': {
        ext: '',
        path_name: 'ubuntu', // TODO: can't check this right now
        cmd: 'Linux'
    }
};

/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */
export class CompileController {

    #child_process;
    #path;

    /** @type {Job[]} */
    #jobs = [];

    /**
     * @param {import('node:child_process')} child_process
     * @param {import('node:path')} path
     */
    constructor(child_process, path) {

        this.#child_process = child_process;
        this.#path = path;

    }

    /**
     * @param {...string} path
     */
    #joinNormPath = (...path) =>
        this.#path.normalize(this.#path.join(...path));

    /**
     * Get the path to Igor's executable for the running platform, in the provided runtime's path.
     * @param {string} runtime_path
     * @returns {Result<string, 'unsupported'>}
     */
    #getIgorPath = (runtime_path) => {
        const platform = igorPlatformMappings[process.platform];

        if (platform === undefined) {
            return {
                err: 'unsupported',
                msg: `Platform ${process.platform} not in known Igor platforms:\n${Object.keys(igorPlatformMappings)}`
            }
        }

        return {
            data: this.#path.join(runtime_path, 'bin', 'igor', platform.path_name, process.arch, `Igor${platform.ext}`)
        };
    }

    /**
     * Get the list of runtimes in a given path.
     * @param {string} path 
     * @returns {Promise<Result<{ [key: string]: RuntimeInfo }, 'directory not found'|'directory read failed'>>}
     */
    getRuntimesInDir = async (path) => {
        if (!Electron_FS.existsSync(path)) {
            return {
                err: 'directory not found',
                msg: `Runtimes directory "${path}" not found!`
            };
        }

        try {
            /** @type {string[]} */
            const list = await new Promise(
                (res, rej) => Electron_FS.readdir(path, (err, data) => {
                    if (err !== null) {
                        rej(err);
                    }

                    // @ts-ignore
                    res(data);
                })
            );

            /** @type { { [key: string]: RuntimeInfo } } */
            const runtimes = {};

            for (const item of list) {
                const igor_res = this.#getIgorPath(item);

                if ('err' in igor_res) {
                    continue;
                }

                const igor_path = this.#path.join(path, igor_res.data);

                /** @type {boolean} */
                const exists = await new Promise((res) =>
                    Electron_FS.exists(igor_path, (exists) => res(exists))
                );

                if (!exists) {
                    continue;
                }

                runtimes[item] = {
                    path: this.#path.join(path, item),
                    igor_path: igor_path
                };
            }

            return {
                data: runtimes
            };

        } catch (err) {
            return {
                err: 'directory read failed',
                msg: err
            };
        }
    }

    /**
     * Select the flags for Igor to run the job.
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {JobCommand} cmd
     * @returns {string[]}
     */
    #getFlagsForJob = (project, runtime_path, cmd) => {
        const flags = [
            `/project=${project.path}`,
            `/config=${project.config}`,
            `/rp=${runtime_path}`
        ];

        switch (cmd) {
            case 'Run':
            case 'Package':
            case 'Clean':
                break;

            default:
                throw `Unhandled command case for flags: ${cmd}`;
        }

        flags.push(igorPlatformMappings[process.platform].cmd, cmd);

        return flags;
    }
   
    /**
     * Run a new job on a given project.
     * @param {GMLProject} project
     * @param {RuntimeInfo} runtime
     * @param {CompileSettings} settings
     * @param {JobCommand} cmd
     * @returns {Result<Job, 'igor missing'>}
     */
    runJob = (project, runtime, settings, cmd) => {

        const proc = this.#child_process.spawn(
            runtime.igor_path,
            this.#getFlagsForJob(project, runtime.path, cmd),
            { cwd: project.dir }
        );

        const job = new Job(cmd, proc, project);
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
    #removeJob = (job) => {
        this.#jobs.splice(this.#jobs.indexOf(job), 1);
    }

    /**
     * Create a new editor instance for a given job.
     * @param {Job} job
     */
    openEditorForJob = (job) => {
        CompileLogViewer.view(job);
    }
}
