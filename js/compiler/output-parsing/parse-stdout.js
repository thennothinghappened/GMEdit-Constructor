import { JobError } from '../JobError.js';

/**
 * @typedef StdoutEntry
 * @prop {JobError} err
 * @prop {Number} first_line
 * @prop {Number} last_line
 */

/**
 * Parse the stdout of an Igor job for errors.
 * @param {String} stdout 
 * @returns {JobError[]}
 */
export function job_parse_stdout(stdout) {

    const errors = [];
    const lines = stdout.split('\n');

    for (let i = 0; i < lines.length; i ++) {

        const runner_error = job_parse_runner_error(lines, i);

        if (runner_error !== null) {

            errors.push(runner_error.err);

            i = runner_error.last_line + 1;
            continue;

        }

    }

    /// Compiler error(s)
    // const permission_error_string = 'Permission Error : ';
    // const compiler_error_string = 'Error : ';

    // const lines = str.split('\n');

    // for (let i = 0; i < lines.length; i ++) {

    //     const line = lines[i];

    //     if (line.startsWith(compiler_error_string)) {

    //         const err_string = line.slice(compiler_error_string.length);
    //         const err = new JobCompilerError(err_string);

    //         Job.#notify(this.#listeners.error, err);

    //         continue;

    //     }

    //     if (line.startsWith(permission_error_string)) {

    //         const reason_code_str = lines[i - 1];
    //         const reason_code_split = reason_code_str?.split('-');
    //         const reason_code = reason_code_split[1]?.trim();
            
    //         const err_string = line.slice(compiler_error_string.length);
    //         const err = new JobPermissionError(err_string);

    //         Job.#notify(this.#listeners.error, err);

    //         continue;

    //     }

    // }

}

/**
 * Parse from a given starting line index a runner error if found.
 * @param {String[]} lines
 * @param {Number} first_line First line to read forward from.
 * @returns {StdoutEntry?}
 */
function job_parse_runner_error(lines, first_line) {

    let current_line = first_line;
    let line = lines[current_line].trim();

    const separator = '############################################################################################';
    const search_string = 'ERROR!!! :: ' + separator;

    if (!line.startsWith(search_string)) {
        return null;
    }

    let last_line = undefined;

    while (current_line++ < lines.length) {

        line = lines[current_line].trim();

        if (line.includes(separator) && current_line + 1 < lines.length) {
            last_line = current_line + 1;
            break;
        }

    }

    if (last_line === undefined) {
        return null;
    }

    /** `of <event name>` */
    const event_name_line_prefix = 'of ';
    const event_name_line_suffix = ',';

    const event_name_line = lines[first_line + 3]
        // .slice(event_name_line_prefix.length)
        // .slice(-event_name_line_suffix.length);

    /** `for object <name>:` */
    const object_name_line_prefix = 'for object ';
    const object_name_line_suffix = ':';

    const object_name_line = lines[first_line + 4]
        // .slice(object_name_line_prefix.length)
        // .slice(-object_name_line_suffix.length);

    /** Stacktrace lines between the 'for object' line, and separator. */
    const stacktrace_lines = lines.slice(first_line + 5, last_line - 1);

    /** `gml_... (line x)` */
    const error_site_line = lines[last_line];

    console.log(`
    RUNNER ERROR:
    ${event_name_line},
    ${object_name_line},
    ${stacktrace_lines},
    ...
    ${error_site_line}
    `);

    const event_name = event_name_line.substring

    return null;

}