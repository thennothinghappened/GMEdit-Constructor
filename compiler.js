import { getCurrentProject } from './utils.js';
import { CompileLogViewer } from './viewer.js';

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

    /** @type {CompilerJob[]} */
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
     * @param {CompilerCommand} cmd
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
            case 'win32': return this.#path.join(runtime_path, 'bin', 'igor', 'windows', 'x86', 'Igor.exe');
            case 'darwin': return this.#path.join(runtime_path, 'bin', 'igor', 'osx', process.arch === 'x64' ? 'x86' : 'arm64', 'Igor');
            default: throw 'Platform unsupported, sorry!'; // TODO: allow user to specify totally custom location.
        }
    }

    /**
     * Select the flags for Igor to run the job.
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {CompilerCommand} cmd
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
     * @param {CompilerCommand} cmd
     * @returns {CompilerJob}
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

        const job = new CompilerJob(cmd, proc, project);
        this.#jobs.push(job);

        job.on('stop', () => {
            this.#removeJob(job);
        });

        return job;

    }

    /**
     *
     * @param {CompilerJob} job
     */
    #removeJob = (job) => {
        
        this.#jobs.splice(this.#jobs.indexOf(job), 1);
    }

    /**
     * Create a new editor instance for a given job.
     * @param {CompilerJob} job
     */
    openEditorForJob = (job) => {
        CompileLogViewer.view(job);
    }
}

/**
 * Wrapper for an Igor compile job.
 */
export class CompilerJob {

    /** @type {CompilerCommand} */
    #command;
    /** @type {import('node:child_process').ChildProcess} */
    #process;
    /** @type {GMLProject} */
    #project;

    #stdout = '';
    #stderr = '';

    #stopped = false;

    /** @type {{[key in CompilerJobEvent]: Set<(data: any?) => void>}} */
    #listeners = {
        stdout: new Set(),
        stderr: new Set(),
        output: new Set(),
        error: new Set(),
        stop: new Set()
    };
    
    /**
     * @param {CompilerCommand} command
     * @param {import('node:child_process').ChildProcess} process
     * @param {GMLProject} project
     */
    constructor(command, process, project) {
        this.#command = command;
        this.#process = process;
        this.#project = project;

        this.#process.once('exit', this.#onExit);
        this.#process.stdout?.on('data', this.#onStdoutData);
        this.#process.stderr?.on('data', this.#onStderrData);
    }

    /**
     * @param {any?} chunk
     */
    #onStdoutData = (chunk) => {
        this.#stdout += chunk.toString();
        CompilerJob.#notify(this.#listeners.stdout, this.stdout);
    }

    /**
     * @param {any?} chunk
     */
    #onStderrData = (chunk) => {
        this.#stderr += chunk.toString();
        CompilerJob.#notify(this.#listeners.stderr, this.stderr);
    }

    #onExit = () => {
        CompilerJob.#notify(this.#listeners.stop);
        this.#process.removeAllListeners();
    }

    /**
     * @param {Set<(data?: any) => void>} listeners
     * @param {any} [data]
     */
    static #notify = (listeners, data) => {
        for (const cb of listeners) {
            cb(data);
        }
    }

    /**
     * Add an event listener for the given event.
     * @param {CompilerJobEvent} event
     * @param {(data?: any) => void} callback
     */
    on = (event, callback) => {
        this.#listeners[event].add(callback);
    }

    /**
     * Stop the job.
     */
    stop = () => {
        this.#process.kill();
    }

    /**
     * The `stdout` output of the job's process.
     */
    get stdout() {
        return this.#stdout;
    }

    /**
     * The `stderr` output of the job's process.
     */
    get stderr() {
        return this.#stderr;
    }

    /**
     * Whether this job has stopped yet.
     */
    get stopped() {
        return this.#stopped;
    }
}
