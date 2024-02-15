import { JobCompilerError, JobPermissionError, JobRunnerError } from './JobError.js';
import { job_parse_stdout } from './output-parsing/parse-stdout.js';

/**
 * Wrapper for an Igor job.
 */
export class Job {

    /** @type {IgorSettings} */
    #settings;
    /** @type {import('node:child_process').ChildProcess} */
    #process;
    /** @type {GMLProject} */
    #project;

    #stdout = '';

    #stopped = false;

    /** @type {{[key in JobEvent]: Set<(data: any?) => void>}} */
    #listeners = {
        stdout: new Set(),
        output: new Set(),
        stop: new Set()
    };
    
    /**
     * @param {IgorSettings} settings
     * @param {import('node:child_process').ChildProcess} process
     * @param {GMLProject} project
     */
    constructor(settings, process, project) {
        this.#settings = settings;
        this.#process = process;
        this.#project = project;

        this.#process.once('exit', this.#onExit);
        this.#process.stdout?.on('data', this.#onStdoutData);
    }

    /**
     * @param {any?} chunk
     */
    #onStdoutData = (chunk) => {

        const str = chunk.toString();
        this.#stdout += str;

        Job.#notify(this.#listeners.stdout, this.stdout);

    }

    #onExit = () => {
        
        Job.#notify(this.#listeners.stop, job_parse_stdout(this.stdout));
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
     * @param {JobEvent} event
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

    /** The `stdout` output of the job's process. */
	get stdout() { return this.#stdout; }

    /** Whether this job has stopped yet. */
	get stopped() { return this.#stopped; }

    /** The command this job is running. */
	get command() { return this.#settings.verb; }

    /** The name of the project this job is running for. */
	get projectName() { return this.#project.name; }

    /** The display name of the project this job is running for. */
	get projectDisplayName() { return this.#project.displayName; }

    /** The directory of the project this job is running for. */
	get projectDir() { return this.#project.dir; }

    /** The path to the `yyz` for the project this job is running for. */
	get projectPath() { return this.#project.path; }

}
