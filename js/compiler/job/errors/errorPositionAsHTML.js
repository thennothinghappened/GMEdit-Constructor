import * as ui from '../../../ui/ui-wrappers.js';
import { GMS2ErrorUtils } from './GMS2ErrorUtils.js';

const OpenDeclaration = $gmedit['ui.OpenDeclaration'];

// FIXME: this is really gross, give it a refactor :P
/**
 * 
 * @param {HTMLElement} group
 * @param {string} scriptString 
 * @param {number} lineNumber
 */
export function errorPositionAsHTML(group, scriptString, lineNumber) {
	const infoRes = GMS2ErrorUtils.parseScriptName(scriptString);

	if (infoRes.ok) {
		const info = infoRes.data;

		switch (info.type) {
			case 'GlobalScript':
				group.appendChild(ui.textButton(`${info.name}, line ${lineNumber}`, () =>
					OpenDeclaration.openLink(`${info.name}:${lineNumber}`, null)
				));
			break;

			case 'Script':
				let rootParent = info.definedIn;

				while (rootParent.type === 'Script') {
					rootParent = rootParent.definedIn;
				}

				switch (rootParent.type) {
					case 'GlobalScript':
						group.appendChild(ui.textButton(`Method ${info.name} (defined in ${rootParent.name}), line ${lineNumber}`, () =>
							OpenDeclaration.openLink(`${rootParent.name}:${lineNumber}`, null)
						));
					break;

					case 'Object':
						// FIXME: mysteriously we're getting off-by-one line numbers but only sometimes??? Is GMEdit doing this???
						group.appendChild(ui.textButton(`Method ${info.name} (defined in ${rootParent.objectName}'s ${rootParent.formattedEventName} Event), line ${lineNumber}`, () =>
							OpenDeclaration.openLink(`${rootParent.objectName}(${rootParent.internalEventName}):${lineNumber}`, null)
						));
					break;
				}
			break;

			case 'Object':
				// FIXME: mysteriously we're getting off-by-one line numbers but only sometimes??? Is GMEdit doing this???
				group.appendChild(ui.textButton(`${info.objectName}'s ${info.formattedEventName} Event, line ${lineNumber}`, () =>
					OpenDeclaration.openLink(`${info.objectName}(${info.internalEventName}):${lineNumber}`, null)
				));
			break;
		}
	} else {
		// Fallback to no link, with tooltip explanation. :(
		const locationElement = document.createElement('span');
		locationElement.appendChild(ui.code(scriptString));
		locationElement.append(`, line ${lineNumber}`);
		
		group.title = `No go-to-line, sorry:\n${infoRes.err}`;
		group.classList.add('gm-constructor-give-tooltip-indicator');
		group.appendChild(locationElement);
	}
}
