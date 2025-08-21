import { BaseError } from '../utils/Err.js';
import { readdir, readFile } from '../utils/node/file.js';
import { flattenOptionArray, isSome, None, Some } from '../utils/Option.js';
import { Err, Ok } from '../utils/Result.js';

/**
 * @implements {GM.UserIndexer}
 */
export class UserIndexerImpl {

	/**
	 * @param {DiskIO} diskIO
	 */
	constructor(diskIO) {
		/** @private */
		this.diskIO = diskIO;
	}

	/**
	 * @type {GM.UserIndexer['getUsers']}
	 */
	async getUsers(path) {

		const FALLBACK_USER_NAME = 'unknownUser_unknownUserID';
		const DEVICES_JSON_FILENAME = 'devices.json';

		const MAYBE_USER_DIR_CONTENTS = [
			'license.plist',
			'local_settings.json',
			DEVICES_JSON_FILENAME
		];

		const dirNameList = await readdir(path);
		
		if (!dirNameList.ok) {
			return Err({ code: 'pathReadError', inner: dirNameList.err });
		}

		/** @type {GM.UserIndexer.InvalidUserInfo[]} */
		const invalidUsers = [];

		/** @type {GM.User[]} */
		const users = (await Promise.all(dirNameList.data.map(async directoryName => {

				const fullPath = this.diskIO.joinPath(path, directoryName);
				let discardEntry = true;

				for (const fileName of MAYBE_USER_DIR_CONTENTS) {
					if (this.diskIO.existsSync(this.diskIO.joinPath(fullPath, fileName))) {
						discardEntry = false;
						break;
					}
				}

				if (discardEntry) {
					return None;
				}

				const nameSplitIndex = directoryName.lastIndexOf('_');

				if (nameSplitIndex <= 0) {
					invalidUsers.push({
						path: fullPath,
						error: {
							code: 'nameInvalidFormat',
							inner: new BaseError(`Expected user name to follow the format "name_id". Found "${directoryName}".`)
						}
					});
					
					return None;
				}

				const name = directoryName.substring(0, nameSplitIndex);

				/** @type {GM.DevicesData} */
				const devices = {
					path: this.diskIO.joinPath(fullPath, DEVICES_JSON_FILENAME),
					forPlatform: {}
				};

				const devicesFile = await readFile(devices.path);

				if (devicesFile.ok) {
					try {

						/** @type {GM.DevicesJson} */
						const devicesJson = JSON.parse(devicesFile.data.toString());

						/** @type {string[]} */
						const androidDevices = [];
						devices.forPlatform['Android'] = androidDevices;

						if (devicesJson.android?.Auto !== undefined) {
							androidDevices.push(...Object.keys(devicesJson.android.Auto));
						}

						if (devicesJson.android?.User !== undefined) {
							androidDevices.push(...Object.keys(devicesJson.android.User));
						}

						/** @type {string[]} */
						const macDevices = [];
						devices.forPlatform['Mac'] = macDevices;

						if (devicesJson.mac !== undefined) {
							macDevices.push(...Object.keys(devicesJson.mac));
						}

						/** @type {string[]} */
						const linuxDevices = [];
						devices.forPlatform['Linux'] = linuxDevices;

						if (devicesJson.linux !== undefined) {
							linuxDevices.push(...Object.keys(devicesJson.linux));
						}

					} catch (err) {
						invalidUsers.push({
							path: fullPath,
							error: {
								code: 'devicesJsonParseFailed',
								inner: new BaseError('Failed to parse devices.json', err)
							}
						});

						return None;
					}
				}

				return Some({
					name,
					directoryName,
					fullPath,
					devices
				});

			})))
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
		
		return Ok({ users, invalidUsers });

	}

}
