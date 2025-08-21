import path from 'node:path';
import { BaseError } from '../Err.js';
import { Err, Ok } from '../Result.js';

/**
 * Implementation of the disk IO handler, using the electron methods provided by GMEdit.
 * 
 * @implements {DiskIO}
 */
export class GMEditDiskIO {
	/**
	 * @type {DiskIO['isDirectorySync']}
	 */
	isDirectorySync(path) {
		return Electron_FS.lstatSync(path).isDirectory();
	}

	/**
	 * @type {DiskIO['existsSync']}
	 */
	existsSync(path) {
		return Electron_FS.existsSync(path);
	}

	/**
	 * @type {DiskIO['readDir']}
	 */
	async readDir(path) {
		return new Promise(resolve => {
			Electron_FS.readdir(path, (err, data) => {

				if (data === undefined) {
					return resolve(Err(new BaseError(
						`Failed to read contents of the directory '${path}'`,
						err
					)));
				}
	
				resolve(Ok(data));
	
			})
		});
	}

	/**
	 * @type {DiskIO['joinPath']}
	 */
	joinPath(...paths) {
		return path.join(...paths);
	}
}
