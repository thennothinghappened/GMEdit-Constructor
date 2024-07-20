import * as ui from '../../ui/ui-wrappers.js';

/**
 * An error that occurred during a Job running.
 */
export class JobError {

    constructor() {}

	/**
	 * Parse an instance of this error type from stdout if any are present.
	 * 
	 * The returned entry specifies the start and end position in the string
	 * that the match was found, to prevent overlaps with other errors.
	 * 
	 * @param {String} string stdout string to parse from.
	 * @returns {StdoutEntry|undefined}
	 */
	static fromStdout(string) {
		return undefined;
	}

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

/**
 * An error Igor encountered due to system file permissions, or execution permissions.
 * 
 * This is a rare one to see, so it's a bit difficult to document what format to expect
 * it in bar one or two times I have seen it personally.
 */
export class JobPermissionsError extends JobError {

	/**
	 * Capture a compile-time error in the format:
	 * ```
	 * Permission Error : some error
	 * ```
	 * 
	 * Uses a look-behind assertion that the preceding character must
	 * be a line break.
	 */
	static regex = /(?<=\n)Permission Error : (?<error>.+)/;

    /**
     * @param {String} error 
     */
    constructor(error) {
        super();
        this.error = error;
    }

	/**
	 * @param {string} string 
	 * @returns {StdoutEntry|undefined}
	 */
	static fromStdout(string) {
		
		const match = string.match(this.regex);
		
		if (match === null || match.groups === undefined || match.index === undefined) {
			return undefined;
		}

		const { error } = match.groups;

		return {
			index: match.index,
			length: match[0].length,
			err: new JobPermissionsError(error)
		};

	}

    /**
     * Get this error nicely formatted as HTML.
     * @param {HTMLElement} parent The parent element to attach to.
     */
    displayHTML(parent) {
        
        const group = ui.group(parent, 'Igor Permission Error');

        const body = document.createElement('pre');
        body.textContent = this.error.toString();

        group.appendChild(body);

    }

    toString() {
        return `Igor Permissions Error: ${this.error}`;
    }

}

/**
 * A generic error in compiling, such as a syntax error.
 */
export class JobCompilationError extends JobError {

	/**
	 * Capture a compile-time error in the format:
	 * ```
	 * Error : some error
	 * ```
	 * 
	 * Uses a look-behind assertion that the preceding character must
	 * be a line break. This is done due to other types of errors that would otherwise
	 * be matched by this rule, e.g. `Permission Error : some error`.
	 */
	static regex = /(?<=\n)Error : (?<error>.+)/;

    /**
     * @param {String} error 
     */
    constructor(error) {
        super();
        this.error = error;
    }

	/**
	 * @param {string} string 
	 * @returns {StdoutEntry|undefined}
	 */
	static fromStdout(string) {
		
		const match = string.match(this.regex);
		
		if (match === null || match.groups === undefined || match.index === undefined) {
			return undefined;
		}

		const { error } = match.groups;

		return {
			index: match.index,
			length: match[0].length,
			err: new JobCompilationError(error)
		};

	}

    /**
     * Get this error nicely formatted as HTML.
     * @param {HTMLElement} parent The parent element to attach to.
     */
    displayHTML(parent) {
        
        const group = ui.group(parent, 'Compilation Error');

        const body = document.createElement('pre');
        body.textContent = this.error.toString();

        group.appendChild(body);

    }

    toString() {
        return `Job Compiler Error: ${this.error}`;
    }

}

export class JobRunnerError extends JobError {

	/**
	 * Some silly regex that captures an error in either the 2024.400<= or 2024.600+ format, since
	 * they randomly changed it ever-so-slightly.
	 */
	static regex = /ERROR!!! :: #+?\nERROR in\saction number 1\sof (?<event>[A-Za-z ]+?)\sfor object (?<object>\S+?):\n+(?<exception>[\s\S]+?)\n#+?\n(?<script>gml_\S+?) \(line (?<line_number>[0-9]+?)\)/;

    /**
     * @param {String} object 
     * @param {String} event 
     * @param {String} script 
     * @param {String} line_number 
     * @param {String} exception 
     */
    constructor(object, event, script, line_number, exception) {
        super();

        this.object = object;
        this.event = event;
        this.script = script;
        this.line_number = line_number;
        this.exception = exception;
    }

	/**
	 * @param {string} string 
	 * @returns {StdoutEntry|undefined}
	 */
	static fromStdout(string) {
		
		const match = string.match(this.regex);
		
		if (match === null || match.groups === undefined || match.index === undefined) {
			return undefined;
		}

		const { event, object, exception, script, line_number } = match.groups;

		return {
			index: match.index,
			length: match[0].length,
			err: new JobRunnerError(
				object,
				event,
				script,
				line_number,
				exception
			)
		};
		
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
        stacktrace.textContent = this.exception;

        group.appendChild(stacktrace);

    }

    toString() {

return `Runner Error:

On line ${this.line_number} of script ${this.script},
In ${this.event} of object ${this.object}:

${this.exception}`;

    }

}
