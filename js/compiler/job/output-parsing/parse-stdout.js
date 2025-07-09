import { GMS2SyntaxError } from '../errors/GMS2SyntaxError.js';
import { JobCompilationError } from '../errors/JobCompilationError.js';
import { JobPermissionsError } from '../errors/JobPermissionsError.js';
import { GMS2RuntimeError } from '../errors/GMS2RuntimeError.js';

/**
 * List of recognised error types to iterate over discovering.
 * 
 * These are intentionally ordered in descending specificity,
 * where the types at the top of the list are more specific, i.e.,
 * less likely to conflict with less specific ones.
 * 
 * There's no doubt a way better way of doing this whole setup but
 * hey, it works, and I'm a bit busy to do a better solution now.
 * 
 * @type {JobErrorDescriptor[]}
 */
const errorDescriptors = [
	GMS2RuntimeError,
	JobPermissionsError,
	GMS2SyntaxError,
	JobCompilationError
];

/**
 * Parse the stdout of an Igor job for errors.
 * 
 * @param {String} stdout 
 * @returns {JobError[]}
 */
export function job_parse_stdout(stdout) {

	/** @type {JobError[]} */
	const errors = [];

	let string = stdout;

	for (const errorDescriptor of errorDescriptors) {
		while (string.length > 0) {

			const entry = parseJobError(string, errorDescriptor);

			if (entry === undefined) {
				break;
			}

			errors.push(entry);

			string =
				string.slice(0, entry.offset - 1) +
				string.slice(entry.offset + entry.length);

		}
	}

	return errors;

}

/**
 * Parse the next {@link JobError} of the given descriptor type, if any more exist.
 * 
 * @param {string} string The string - probably `stdout` or `stderr` - to search in.
 * @param {JobErrorDescriptor} errorDescriptor The descriptor for the error type to search for.
 * @returns {JobError|undefined}
 */
function parseJobError(string, errorDescriptor) {
	
	const match = string.match(errorDescriptor.regex);
	
	if (match === null || match.groups === undefined || match.index === undefined) {
		return undefined;
	}

	const groups = match.groups;

	return {
		offset: match.index,
		length: match[0].length,
		asHTML: () => errorDescriptor.asHTML(groups)
	};

}
