
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
     * @param {String} object 
     * @param {String} event 
     * @param {String} script 
     * @param {String} line_number 
     * @param {String[]} stacktrace 
     */
    constructor(object, event, script, line_number, stacktrace) {
        super();

        this.object = object;
        this.event = event;
        this.script = script;
        this.line_number = line_number;
        this.stacktrace = stacktrace;
    }

    /**
     * Get this error nicely formatted as HTML.
     */
    displayHTML() {
        
        const e = document.createElement('div');

        const title = document.createElement('h1');
        title.textContent = 'Runner Error';

        e.appendChild(title);

        const blurb1 = document.createElement('p');
        blurb1.textContent = `On line ${this.line_number} of script ${this.script},`;

        e.appendChild(blurb1);

        const blurb2 = document.createElement('p');
        blurb2.textContent = `In ${this.event} of object ${this.object}:`;

        e.appendChild(blurb2);

        const stacktrace = document.createElement('pre');
        stacktrace.textContent = this.stacktrace.join('\n');

        e.appendChild(stacktrace);

        return e;

    }

    toString() {

return `Runner Error:

On line ${this.line_number} of script ${this.script},
In ${this.event} of object ${this.object}:

${this.stacktrace.join('\n')}`;

    }

}
