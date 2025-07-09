import * as ui from '../../../ui/ui-wrappers.js';
import { errorPositionAsHTML } from './errorPositionAsHTML.js';
import { GMS2ErrorUtils } from './GMS2ErrorUtils.js';
import { GMS2SyntaxError } from './GMS2SyntaxError.js';

const OpenDeclaration = $gmedit['ui.OpenDeclaration'];

/** 
 * An error that occurred at runtime.
 * @type {JobErrorDescriptor} 
 */
export const GMS2RuntimeError = {

	/**
	 * Some silly regex that captures an error in either the 2024.400<= or 2024.600+ format, since
	 * they randomly changed it ever-so-slightly.
	 */
	regex: /^ERROR!!! :: #+\nERROR in\saction number 1\sof (?<event>[A-Za-z0-9 ]+?)\sfor object (?<object>\S+?):\n+(?<exception>[\s\S]+?)(\n at [^\n]+)?\n#+\n(?<stackTrace>(?:gml_.+?\n)+)/m,

	asHTML: ({ event, object, stackTrace, exception }) => {

		const fragment = new DocumentFragment();
		
		if (object !== '<undefined>') {
			const blurb = document.createElement('div');

			blurb.append(ui.b(event), ' of object ', ui.code(object), ':');
			blurb.appendChild(document.createElement('br'));

			fragment.appendChild(blurb);
		}

		const exceptionElement = document.createElement('pre');
		exceptionElement.textContent = exception;

		fragment.appendChild(exceptionElement);

		const stackTraceInfo = stackTrace
			.split('\n')
			.map(line => line.match(/(?<scriptName>gml_\S+) \(line (?<lineNumber>[0-9]+)\)(?:\s-\s+(?<sourceLine>.+))?/))
			.filter(matches => matches !== null)
			.map(matches => matches.groups)
			.filter(groups => groups !== undefined)
			.map(groups => ({
				rawScriptName: groups.scriptName,
				lineNumber: Number(groups.lineNumber),
				sourceLine: groups.sourceLine ?? undefined
			}));

		fragment.appendChild(document.createElement('hr'));

		for (const info of stackTraceInfo) {
			const element = document.createElement('div');
			errorPositionAsHTML(element, info.rawScriptName, info.lineNumber);

			if (info.sourceLine !== undefined) {
				element.append(' - ');
				element.appendChild(ui.code(info.sourceLine));
			}

			fragment.appendChild(element);
		}

		return fragment;

	}

};
