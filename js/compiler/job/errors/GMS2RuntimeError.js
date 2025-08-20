import * as ui from '../../../ui/ui-wrappers.js';
import { errorPositionAsHTML } from './errorPositionAsHTML.js';

const OpenDeclaration = $gmedit['ui.OpenDeclaration'];

/** 
 * An error that occurred at runtime.
 * @type {GM.Job.ErrorDescriptor} 
 */
export const GMS2RuntimeError = {

	/**
	 * Some silly regex that captures an error in either the 2024.400<= or 2024.600+ format, since
	 * they randomly changed it ever-so-slightly.
	 */
	regex: /^ERROR!!! :: #+\nERROR in\saction number 1\sof (?<event>[A-Za-z0-9 ]+?)\sfor object (?<object>\S+?):\n+(?<exception>[\s\S]+?)(\n at [^\n]+)?\n#+\n(?<stackTrace>(?:gml_.+?\n)+)/m,

	asHTML: ({ event, object, stackTrace, exception }) => {

		const group = document.createElement('div');
		
		if (object !== '<undefined>') {
			group.append(ui.b(event), ' of object ', ui.code(object), ':');
		}

		const exceptionElement = document.createElement('pre');
		exceptionElement.textContent = exception;

		group.appendChild(exceptionElement);

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

		group.appendChild(document.createElement('hr'));

		for (const info of stackTraceInfo) {
			const element = document.createElement('div');
			errorPositionAsHTML(element, info.rawScriptName, info.lineNumber);

			if (info.sourceLine !== undefined) {
				element.append(' - ');
				element.appendChild(ui.code(info.sourceLine));
			}

			group.appendChild(element);
		}

		return group;

	}

};
