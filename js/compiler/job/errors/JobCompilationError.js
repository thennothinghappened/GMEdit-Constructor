import * as ui from '../../../ui/ui-wrappers.js';

/** 
 * A generic error in compiling, such as a syntax error.
 * @type {JobErrorDescriptor} 
 */
export const JobCompilationError = {

	/**
	 * Capture a compile-time error in the format:
	 * ```
	 * Error : some error
	 * ```
	 */
	regex: /^Error : (?<error>.+)/m,

	asHTML: ({ error }) => {

		const fragment = new DocumentFragment();
		const group = ui.group(fragment, 'Compilation Error');

		const body = document.createElement('pre');
		body.textContent = error;

		group.appendChild(body);

		return fragment;

	},

	asString: ({ error }) => `Job Compiler Error: ${error}`

};
