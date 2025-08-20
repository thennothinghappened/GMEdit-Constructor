import * as ui from '../../../ui/ui-wrappers.js';
import { errorPositionAsHTML } from './errorPositionAsHTML.js';

/** 
 * A syntax error encountered by the GMS2 compiler.
 * @type {GM.Job.ErrorDescriptor} 
 */
export const GMS2SyntaxError = {

	regex: /^Error : (?<scriptString>gml_[a-zA-Z_][a-zA-Z0-9_]*)\((?<lineNumber>[0-9]+)\) : (?<message>.+)$/m,

	asHTML: ({ scriptString, lineNumber, message }) => {
		const group = document.createElement('div');
		const actualLineNumber = Number(lineNumber) + 1;

		errorPositionAsHTML(group, scriptString, actualLineNumber);
		group.append(' - ');
		group.appendChild(ui.code(message));

		return group;
	}

};
