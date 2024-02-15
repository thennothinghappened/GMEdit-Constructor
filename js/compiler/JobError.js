
/**
 * An error that occured during a Job running.
 */
export class JobError {

    constructor() {}

    /**
     * Get this error nicely formatted as HTML.
     */
    displayHTML() {
        
        const e = document.createElement('div');

        const title = document.createElement('h1');
        title.textContent = 'Job Error';

        e.appendChild(title);

        const body = document.createElement('pre');

        e.appendChild(body);

        return e;

    }

    toString() {
        return 'Job Error!';
    }

}

export class JobCompilerError extends JobError {

    /**
     * @param {String} data 
     */
    constructor(data) {
        super();
        this.data = data;
    }

    /**
     * Get this error nicely formatted as HTML.
     */
    displayHTML() {
        
        const e = document.createElement('div');

        const title = document.createElement('h1');
        title.textContent = 'Compilation Error';

        e.appendChild(title);

        const body = document.createElement('pre');
        body.textContent = this.data.toString();

        e.appendChild(body);

        return e;

    }

    toString() {
        return `Job Compiler Error: ${this.data}`;
    }

}

export class JobRunnerError extends JobError {

    /**
     * @param {String} data 
     */
    constructor(data) {
        super();
    }

    /**
     * Get this error nicely formatted as HTML.
     */
    displayHTML() {
        
        const e = document.createElement('div');

        const title = document.createElement('h1');
        title.textContent = 'Runner Error';

        e.appendChild(title);

        const body = document.createElement('pre');
        body.textContent = this.err_data.toString();

        e.appendChild(body);

        return e;

    }

    toString() {
        return `Job Runner Error: ${this.err_data}`;
    }

}

export class JobPermissionError extends JobError {

    /**
     * @param {String} data 
     */
    constructor(data) {
        super();
        this.data = data;
    }

    /**
     * Get this error nicely formatted as HTML.
     */
    displayHTML() {
        
        const e = document.createElement('div');

        const title = document.createElement('h1');
        title.textContent = 'Runner Error';

        e.appendChild(title);

        const body = document.createElement('pre');
        body.textContent = this.err_data.toString();

        e.appendChild(body);

        return e;

    }

    toString() {
        return `Job Runner Error: ${this.err_data}`;
    }

}