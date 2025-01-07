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
	 * 
	 * Uses a look-behind assertion that the preceding character must
	 * be a line break. This is done due to other types of errors that would otherwise
	 * be matched by this rule, e.g. `Permission Error : some error`.
	 */
	regex: /(?<=\n)Error : (?<error>.+)/,

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
