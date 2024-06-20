import * as ui from '../../ui/ui-wrappers.js';

/**
 * An error that occured during a Job running.
 */
export class JobError {

    constructor() {}

    /**
     * Get this error nicely formatted as HTML.
     * @param {HTMLElement} parent The parent element to attach to.
     */
    displayHTML(parent) {
        
        const group = ui.group(parent, 'Job Error');
        const body = document.createElement('pre');

        group.appendChild(body);

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
     * @param {HTMLElement} parent The parent element to attach to.
     */
    displayHTML(parent) {
        
        const group = ui.group(parent, 'Compilation Error');

        const body = document.createElement('pre');
        body.textContent = this.data.toString();

        group.appendChild(body);

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
     * @param {HTMLElement} parent The parent element to attach to.
     */
    displayHTML(parent) {
        
        const group = ui.group(parent, 'Runner Error');

        const blurb = document.createElement('p');
        blurb.append('In the event ', ui.b(this.event), ' for object ', ui.code(this.object), ',');
        blurb.appendChild(document.createElement('br'));
        blurb.append('On line ', ui.b(this.line_number), ' of script ', ui.code(this.script), ':');

        group.appendChild(blurb);

        const stacktrace = document.createElement('pre');
        stacktrace.textContent = this.stacktrace.join('\n');

        group.appendChild(stacktrace);

    }

    toString() {

return `Runner Error:

On line ${this.line_number} of script ${this.script},
In ${this.event} of object ${this.object}:

${this.stacktrace.join('\n')}`;

    }

}
