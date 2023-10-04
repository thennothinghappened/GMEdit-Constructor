
/**
 * Wrapper for an Igor job.
 */
export class Job {

    /** @type {JobCommand} */
    #command;
    /** @type {import('node:child_process').ChildProcess} */
    #process;
    /** @type {GMLProject} */
    #project;

    #stdout = '';
    #stderr = '';

    #stopped = false;

    /** @type {{[key in JobEvent]: Set<(data: any?) => void>}} */
    #listeners = {
        stdout: new Set(),
        stderr: new Set(),
        output: new Set(),
        error: new Set(),
        stop: new Set()
    };
    
    /**
     * @param {JobCommand} command
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
        Job.#notify(this.#listeners.stdout, this.stdout);
    }

    /**
     * @param {any?} chunk
     */
    #onStderrData = (chunk) => {
        this.#stderr += chunk.toString();
        Job.#notify(this.#listeners.stderr, this.stderr);
    }

    #onExit = () => {
        Job.#notify(this.#listeners.stop);
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

    /** The `stderr` output of the job's process. */
	get stderr() { return this.#stderr; }

    /** Whether this job has stopped yet. */
	get stopped() { return this.#stopped; }

    /** The command this job is running. */
	get command() { return this.#command; }

    /** The name of the project this job is running for. */
	get projectName() { return this.#project.name; }

    /** The display name of the project this job is running for. */
	get projectDisplayName() { return this.#project.displayName; }

    /** The directory of the project this job is running for. */
	get projectDir() { return this.#project.dir; }

    /** The path to the `yyz` for the project this job is running for. */
	get projectPath() { return this.#project.path; }

}
