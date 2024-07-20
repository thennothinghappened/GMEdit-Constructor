import { ConstructorControlPanel } from '../../../ui/editors/ConstructorControlPanel.js';
import { Err } from '../../../utils/Err.js';
import { JobCompilationError, JobError, JobPermissionsError, JobRunnerError } from '../JobError.js';

/**
 * List of recognised error types to iterate over discovering.
 * 
 * These are intentionally ordered in descending specificity,
 * where the types at the top of the list are more specific, i.e.,
 * less likely to conflict with less specific ones.
 * 
 * There's no doubt a way better way of doing this whole setup but
 * hey, it works, and I'm a bit busy to do a better solution now.
 */
const error_types = [
	JobRunnerError,
	JobPermissionsError,
	JobCompilationError
];

/**
 * Parse the stdout of an Igor job for errors.
 * @param {String} stdout 
 * @returns {JobError[]}
 */
export function job_parse_stdout(stdout) {

	/** @type {JobError[]} */
    const errors = [];

	let string = stdout;

	for (const error_type of error_types) {
		while (string.length > 0) {

			const entry = error_type.fromStdout(string);

			if (entry === undefined) {
				break;
			}

			errors.push(entry.err);

			string =
				string.slice(0, entry.index - 1) +
				string.slice(entry.index + entry.length);

		}
	}

    return errors;

}
