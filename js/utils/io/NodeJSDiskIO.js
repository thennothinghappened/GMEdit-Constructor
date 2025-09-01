import { BaseError } from '../Err.js';
import { Err, Ok } from '../Result.js';

/**
 * Implementation of the disk IO handler, using NodeJS methods which GMEdit provides.
 * 
 * @implements {DiskIO}
 */
export class NodeJSDiskIO {
	/**
	 * @param {import('node:path').join} nodeJoinPath 
	 * @param {typeof import('node:fs')} nodeFs
	 */
	constructor(nodeJoinPath, nodeFs) {
		/** @private */
		this.nodeJoinPath = nodeJoinPath;

		/** @private */
		this.nodeFs = nodeFs;
	}

	/**
	 * @type {DiskIO['existsSync']}
	 */
	existsSync(path) {
		return this.nodeFs.existsSync(path);
	}

	/**
	 * @type {DiskIO['isDirectorySync']}
	 */
	isDirectorySync(path) {
		return this.nodeFs.lstatSync(path).isDirectory();
	}

	/**
	 * @type {DiskIO['readDir']}
	 */
	readDir(path) {
		return new Promise(resolve => {
			this.nodeFs.readdir(path, (err, data) => {

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
	 * @type {DiskIO['readFile']}
	 */
	readFile(path) {
		return new Promise(resolve => {
			this.nodeFs.readFile(path, (err, data) => {

				if (data === undefined) {
					return resolve(Err(new BaseError(
						`Failed to read the file '${path}'`,
						err
					)));
				}

				resolve(Ok(data));

			})
		});
	}

	/**
	 * @type {DiskIO['readFileSync']}
	 */
	readFileSync(path) {
		try {
			return Ok(this.nodeFs.readFileSync(path));
		} catch (err) {
			return Err(new BaseError(`Failed to read the file at "${path}"`, err));
		}
	}

	/**
	 * @type {DiskIO['createDir']}
	 */
	createDir(path, recursive) {
		return new Promise(resolve => {
			this.nodeFs.mkdir(path, { recursive }, (err) => {
				if (err === null) {
					resolve(Ok(undefined));
				} else {
					resolve(Err(new BaseError(
						`Failed to create the directory '${path}'`,
						err
					)));
				}
			});
		});
	}

	/**
	 * @type {DiskIO['writeFile']}
	 */
	writeFile(path, data) {
		return new Promise(resolve => {
			this.nodeFs.writeFile(path, data, (err) => {
				if (err !== undefined) {
					return resolve(Err(new BaseError(
						`Failed to write the file '${path}'`,
						err
					)));
				}

				resolve(Ok(undefined));
			})
		});
	}

	/**
	 * @type {DiskIO['writeFileSync']}
	 */
	writeFileSync(path, data) {
		try {
			return Ok(this.nodeFs.writeFileSync(path, data));
		} catch (err) {
			return Err(new BaseError(`Failed to write the file at "${path}"`, err));
		}
	}

	/**
	 * @type {DiskIO['joinPath']}
	 */
	joinPath(...paths) {
		return this.nodeJoinPath(...paths);
	}
}
