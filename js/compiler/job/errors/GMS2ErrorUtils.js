import { BaseError } from '../../../utils/Err.js';
import { Err, Ok } from '../../../utils/Result.js';

const GmlEvent = $gmedit['parsers.GmlEvent'];
const GmlKeyCode = $gmedit['parsers.GmlKeycode'];

export class GMS2ErrorUtils {
	/**
	 *
	 * @param {string} fullName
	 * @returns {Result<GMS2.ErrorUtils.ScriptInfo>}
	 */
	static parseScriptName(fullName) {
		let rest = fullName.substring('gml_'.length);
		const typeSplitPos = rest.indexOf('_');

		if (typeSplitPos < 0) {
			return Err(new BaseError(`Unknown script name format \`${fullName}\``));
		}

		const type = rest.substring(0, typeSplitPos);
		rest = rest.substring(typeSplitPos + 1);

		switch (type) {
			case 'GlobalScript':
				return Ok({
					type: 'GlobalScript',
					name: rest
				});

			case 'Script':
				if (!rest.includes('@')) {
					return Err(new BaseError('TODO: best-effort parsing of LTS-style script identifiers'));
				}

				/** @type {string} */
				let name;

				/** @type {string} */
				let parentFullName;

				if (rest.startsWith('anon@')) {
					rest = rest.substring('anon@'.length + 1);
					const parentSplitPos = rest.indexOf('@');

					if (parentSplitPos < 0) {
						return Err(new BaseError(`Expected anonymous script line \`${fullName}\` to have a parent script name!`));
					}

					const anonIndex = rest.substring(0, parentSplitPos);

					name = `<anon function ${anonIndex}>`;
					parentFullName = rest.substring(parentSplitPos + 1);
				} else {
					const parentSplitPos = rest.indexOf('@');

					if (parentSplitPos < 0) {
						return Err(new BaseError(`Expected script line \`${fullName}\` to have a parent script name!`));
					}

					name = rest.substring(0, parentSplitPos);
					parentFullName = rest.substring(parentSplitPos + 1);
				}

				const parentInfo = this.parseScriptName(parentFullName);

				if (!parentInfo.ok) {
					return Err(new BaseError(`Failed to parse function \`${name}\`'s parent script name`, parentInfo.err));
				}

				return Ok({
					type: 'Script',
					name: name,
					definedIn: parentInfo.data
				});

			case 'Object':
				if (rest.includes('_Collision_')) {
					return Err(new BaseError('Don\'t know how to parse when `_Collision_` appears due to ambiguous naming :('));
				}

				const subEventUnderscorePos = rest.lastIndexOf('_');
				const eventUnderscorePos = rest.lastIndexOf('_', subEventUnderscorePos - 1);
				
				const objectName = rest.substring(0, eventUnderscorePos);
				const eventRawName = rest.substring(eventUnderscorePos + 1, subEventUnderscorePos);
				const subEventName = Number(rest.substring(subEventUnderscorePos + 1));

				/** @type {string} */
				let internalEventName;

				if (eventRawName.startsWith('Key')) {
					internalEventName = `${eventRawName.toLowerCase()}:${GmlKeyCode.toName(subEventName)}`;
				} else {
					internalEventName = GmlEvent.i2s[GmlEvent.sc2t[eventRawName]][subEventName];
				}

				return Ok({
					type: 'Object',
					objectName,
					internalEventName,
					formattedEventName: internalEventName
						.split(' ')
						.map(word => word[0].toUpperCase() + word.substring(1))
						.join(' '),
				});
		}

		return Err(new BaseError(`Unknown script type \`${type}\``));
	}
}
