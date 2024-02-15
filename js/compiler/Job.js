import { JobCompilerError, JobPermissionError, JobRunnerError } from './JobError.js';

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
        error: new Set(),
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

        this.#parseStdoutData(str.trim());
    }

    #onExit = () => {
        Job.#notify(this.#listeners.stop);
        this.#process.removeAllListeners();
    }

    /**
     * Parse stdout data being appended to look for errors!
     * 
     * TODO: very dirty quick code to get this running today, gonna make this multiple funcs.
     * @param {String} str
     */
    #parseStdoutData = (str) => {

        /// Runner error
        const runner_error_string = 'ERROR!!! :: ';

        if (str.startsWith(runner_error_string)) {

            const err_string = str.slice(runner_error_string.length);
            const err = new JobRunnerError(err_string);

            return Job.#notify(this.#listeners.error, err);
        }

        /// Compiler error(s)
        const permission_error_string = 'Permission Error : ';
        const compiler_error_string = 'Error : ';

        const lines = str.split('\n');

        for (let i = 0; i < lines.length; i ++) {

            const line = lines[i];

            if (line.startsWith(compiler_error_string)) {

                const err_string = line.slice(compiler_error_string.length);
                const err = new JobCompilerError(err_string);
    
                Job.#notify(this.#listeners.error, err);

                continue;
    
            }

            if (line.startsWith(permission_error_string)) {

                const reason_code_str = lines[i - 1];
                const reason_code_split = reason_code_str?.split('-');
                const reason_code = reason_code_split[1]?.trim();
                
                const err_string = line.slice(compiler_error_string.length);
                const err = new JobPermissionError(err_string);
    
                Job.#notify(this.#listeners.error, err);

                continue;

            }

        }

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
