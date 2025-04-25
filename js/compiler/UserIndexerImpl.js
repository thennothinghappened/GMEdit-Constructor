import { readdir } from '../utils/node/file.js';
import * as nodeModulesProvider from '../utils/node/node-import.js';
import { flatMapOk as flattenOptionArray, isSome, None, Some } from '../utils/Option.js';
import { Err, Ok } from '../utils/Result.js';

/**
 * @implements {GM.UserIndexer}
 */
export class UserIndexerImpl {

	/**
	 * @type {GM.UserIndexer['getUsers']}
	 */
	async getUsers(path) {

		const FALLBACK_USER_NAME = 'unknownUser_unknownUserID';
		const ANY_OF_THESE_MUST_EXIST = [
			'license.plist',
			'local_settings.json'
		];

		const dirNameList = await readdir(path);
		
		if (!dirNameList.ok) {
			return Err({ code: 'pathReadError', inner: dirNameList.err });
		}

		/** @type {GM.User[]} */
		const users = dirNameList.data.map(directoryName => {

				const fullPath = nodeModulesProvider.path.join(path, directoryName);
				let isValid = false;

				for (const fileName of ANY_OF_THESE_MUST_EXIST) {
					if (Electron_FS.existsSync(nodeModulesProvider.path.join(fullPath, fileName))) {
						isValid = true;
						break;
					}
				}

				if (!isValid) {
					return None;
				}

				/** @type {string} */
				let name;
				const nameSplitIndex = directoryName.lastIndexOf('_');

				if (nameSplitIndex > 0) {
					name = directoryName.substring(0, nameSplitIndex);
				} else {
					// TODO: report error - user name format is different to expectation.
					name = directoryName;
				}

				return Some({
					name,
					directoryName,
					fullPath
				});

			})
			.flatMap(flattenOptionArray)
			.sort((a, b) => {
				if (a.name === FALLBACK_USER_NAME) {
					return 1;
				}

				if (b.name === FALLBACK_USER_NAME) {
					return -1;
				}

				return Number(a.name > b.name);
			});
		
		return Ok({ users });

	}

}
