import * as ui from '../../../ui/ui-wrappers.js';
import { BaseError } from '../../../utils/Err.js';
import { Err, Ok } from '../../../utils/Result.js';
import { docString } from '../../../utils/StringUtils.js';

const OpenDeclaration = $gmedit['ui.OpenDeclaration'];

/** 
 * A syntax error encountered by the GMS2 compiler.
 * @type {JobErrorDescriptor} 
 */
export const GMS2SyntaxError = {

	regex: /^Error : gml_(?<scriptType>[A-Z][a-zA-Z]*)_(?<scriptString>[a-zA-Z_][a-zA-Z0-9_]*)\((?<lineNumber>[0-9]+)\) : (?<message>.+)$/m,

	asHTML: ({ scriptType, scriptString, lineNumber, message }) => {
		const group = document.createElement('div');
		const actualLineNumber = Number(lineNumber) + 1;

		/** @type {string|undefined} */
		let parseError = undefined;

		switch (scriptType) {
			case 'GlobalScript':
				group.appendChild(ui.textButton(`${scriptString}, line ${actualLineNumber}`, () =>
					OpenDeclaration.openLink(`${scriptString}:${actualLineNumber}`, null)
				));
			break;

			case 'Object':
				const result = parseErrorObjectLocation(scriptString);

				if (!result.ok) {
					parseError = result.err;
					break;
				}

				const { objectName, gmeditEventName } = result.data;
				
				group.appendChild(ui.textButton(`${objectName} ${gmeditEventName} event, line ${actualLineNumber}`, () =>
					OpenDeclaration.openLink(`${objectName}(${gmeditEventName}):${actualLineNumber}`, null)
				));
			break;

			default: parseError = `Unknown script type \`${scriptType}\``;
		}

		if (parseError !== undefined) {
			// Fallback to no link, with tooltip explanation. :(
			const locationElement = document.createElement('span');
			locationElement.appendChild(ui.code(scriptString));
			locationElement.append(`, line ${actualLineNumber}`);
			
			group.title = `No go-to-line, sorry:\n${parseError}`;
			group.classList.add('gm-constructor-give-tooltip-indicator');
			group.appendChild(locationElement);
		}

		group.append(' - ');
		group.appendChild(ui.code(message));

		return group;
	}

};

/**
 * @param {string} location
 * @returns {Result<{ objectName: string, gmeditEventName: string }, string>}
 */
function parseErrorObjectLocation(location) {

	const GmlEvent = $gmedit['parsers.GmlEvent'];
	const GmlKeyCode = $gmedit['parsers.GmlKeycode'];

	if (location.includes('_Collision_')) {
		return Err('Don\'t know how to parse when `_Collision_` appears due to ambiguous naming :(');
	}

	const subEventUnderscorePos = location.lastIndexOf('_');
	const eventUnderscorePos = location.lastIndexOf('_', subEventUnderscorePos - 1);
	
	const objectName = location.substring(0, eventUnderscorePos);
	const eventRawName = location.substring(eventUnderscorePos + 1, subEventUnderscorePos);
	const subEventName = Number(location.substring(subEventUnderscorePos + 1));

	/** @type {string} */
	let gmeditEventName;

	if (eventRawName.startsWith('Key')) {
		gmeditEventName = `${eventRawName.toLowerCase()}:${GmlKeyCode.toName(subEventName)}`;
	} else {
		gmeditEventName = GmlEvent.i2s[GmlEvent.sc2t[eventRawName]][subEventName]
			.split(' ')
			.map(word => word[0].toUpperCase() + word.substring(1))
			.join(' ');
	}

	return Ok({ objectName, gmeditEventName });

}
