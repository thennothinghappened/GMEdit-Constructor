import * as ui from '../../../ui/ui-wrappers.js';

/**
 * An error Igor encountered due to system file permissions, or execution permissions.
 * 
 * This is a rare one to see, so it's a bit difficult to document what format to expect
 * it in bar one or two times I have seen it personally.
 * 
 * @type {GM.Job.ErrorDescriptor} 
 */
export const JobPermissionsError = {

	/**
	 * Capture a compile-time error in the format:
	 * ```
	 * Permission Error : some error
	 * ```
	 */
	regex: /^Permission Error : (?<error>.+)/m,

	asHTML: ({ error }) => {

		const fragment = new DocumentFragment();
		const group = ui.group(fragment, 'Igor Permission Error');

		const body = document.createElement('pre');
		body.textContent = error.toString();

		group.appendChild(body);

		return fragment;

	}

};
