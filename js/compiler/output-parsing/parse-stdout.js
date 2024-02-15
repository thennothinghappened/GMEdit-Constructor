import { JobCompilerError, JobError, JobRunnerError } from '../JobError.js';

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

    const permission_error_string = 'Permission Error : ';
    const compiler_error_string = 'Error : ';

    for (let i = 0; i < lines.length; i ++) {

        const runner_error = job_parse_runner_error(lines, i);

        if (runner_error !== null) {

            errors.push(runner_error.err);

            i = runner_error.last_line + 1;
            continue;

        }

        const line = lines[i];

        if (line.startsWith(compiler_error_string)) {

            const err_string = line.slice(compiler_error_string.length);
            const err = new JobCompilerError(err_string);

            errors.push(err);

            continue;

        }

    }

    return errors;

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

    try {

        /** `of <event name>` */
        const event_name_line_prefix = 'of ';
        const event_name_line_suffix = ',';

        const event_name = lines[first_line + 3]
            .split(event_name_line_prefix)[1]
            .split(event_name_line_suffix)[0];

        /** `for object <name>:` */
        const object_name_line_prefix = 'for object ';
        const object_name_line_suffix = ':';

        const object_name = lines[first_line + 4]
            .split(object_name_line_prefix)[1]
            .split(object_name_line_suffix)[0];

        /** Stacktrace lines between the 'for object' line, and separator. */
        const stacktrace_lines = lines
            .slice(first_line + 5, last_line - 1);

        // foul code to remove empty beginning lines
        for (let i = 0; i < stacktrace_lines.length; i ++) {
            
            const line = stacktrace_lines[i];

            if (line.trim().length !== 0) {
                break;
            }

            stacktrace_lines.splice(i, 1);
            i --;

        }

        /** `gml_... (line x)` */
        const error_site_str = lines[last_line];

        const error_site_line_num = error_site_str
            .split(')')[0]
            .split('(line ')[1];
        
        const error_site_script = error_site_str
            .split('(line')[0]
            .trim();

        return {
            first_line,
            last_line,
            err: new JobRunnerError(
                object_name,
                event_name,
                error_site_script,
                error_site_line_num,
                stacktrace_lines
            )
        };

    } catch (err) {

        console.error('Spaghetti code I had no faith in has indeed failed (failed to parse potential runner error message):', err);

        return null;
    }

}
