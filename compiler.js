import { getCurrentProject } from './utils.js';
import { CompileLogViewer } from './viewer.js';
import { Job } from './job.js';

/** @type {{[key in NodeJS.Platform]: string}} */
const defaultRuntimePaths = {
    'win32': 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
    'darwin': '/Users/Shared/GameMakerStudio2/Cache/runtimes'
};

/** @type {{[key in NodeJS.Platform]: string}} */
const platformMappings = {
    'win32': 'Windows',
    'darwin': 'Mac',
    'linux': 'Linux'
};

export function getDefaultRuntimesPath() { 
    return defaultRuntimePaths[process.platform];
}

/**
 * Get the list of runtimes found in a path.
 *
 * @param {string} [path]
 */
export function getAllRuntimes(path) {
    const runtimes_path = path ?? getDefaultRuntimesPath();

    if (runtimes_path === undefined) {
        throw 'Platform unsupported! Please provide the runtimes path manually';
    }
    
    if (!Electron_FS.existsSync(runtimes_path)) {
        throw `Runtimes path ${runtimes_path} doesn't exist`;
    }

    return Electron_FS.readdirSync(runtimes_path);
}

/**
 * Container for controlling the list of compile jobs,
 * and starting new ones on projects.
 */
export class Compiler {

    #process;
    #child_process;
    #path;

    /** @type {Job[]} */
    #jobs = [];

    /**
     * @param {(error: string) => void} showError
     * @param {import('node:process')} process 
     * @param {import('node:child_process')} child_process
     * @param {import('node:path')} path
     */
    constructor(showError, process, child_process, path) {

        this.#process = process;
        this.#child_process = child_process;
        this.#path = path;

    }

    /**
     * Run a job on the currently open project.
     * @param {string} runtime_path
     * @param {CompileSettings} settings
     * @param {JobCommand} cmd
     */
    runJobOnCurrentProject = (runtime_path, settings, cmd) => {
        const proj = getCurrentProject();

        if (proj === undefined) {
            throw 'Tried to run tasks on non-existent project!';
        }

        return this.#runJob(proj, runtime_path, settings, cmd);
    }

    /**
     * @param {...string} path
     */
    #joinNormPath = (...path) =>
        this.#path.normalize(this.#path.join(...path));

    /**
     * Get the path to Igor's executable for the running platform, in the provided runtime's path.
     * @param {string} runtime_path
     */
    #getIgorPath = (runtime_path) => {
        switch (process.platform) {
            case 'win32': return this.#path.join(runtime_path, 'bin', 'igor', 'windows', process.arch, 'Igor.exe');
            case 'darwin': return this.#path.join(runtime_path, 'bin', 'igor', 'osx', process.arch, 'Igor');
            default: throw 'Platform unsupported, sorry!'; // TODO: allow user to specify totally custom location.
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
                flags.push(`/of=${ this.#joinNormPath(project.dir, 'output') }`);
                flags.push(`/cache=${ this.#joinNormPath(project.dir, 'cache') }`);
                break;

            case 'Clean':
                // TODO: get a proper place for this!
                flags.push(`/of=${this.#joinNormPath(project.dir, '..', 'output', project.name)}`);
                flags.push(`/cache=${this.#joinNormPath(project.dir, '..', 'cache', project.name)}`);
                break;

            default:
                throw `Unhandled command case for flags: ${cmd}`;
        }

        flags.push(platformMappings[process.platform], cmd);

        return flags;
    }
   
    /**
     * Run a new job on a given project.
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {CompileSettings} settings
     * @param {JobCommand} cmd
     * @returns {Job}
     */
    #runJob = (project, runtime_path, settings, cmd) => {
        const igor_path = this.#getIgorPath(runtime_path);

        if (!Electron_FS.existsSync(igor_path)) {
            throw `Failed to find Igor at ${igor_path}`;
        }

        const proc = this.#child_process.spawn(
            igor_path,
            this.#getFlagsForJob(project, runtime_path, cmd),
            { cwd: project.dir }
        );

        const job = new Job(cmd, proc, project);
        this.#jobs.push(job);

        job.on('stop', () => {
            this.#removeJob(job);
        });

        return job;

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
