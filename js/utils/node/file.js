import { Err } from '../Err.js';

/**
 * Promise version of `Electron_FS.readFile`.
 * @param {string} path 
 * @returns {Promise<Result<Buffer>>}
 */
export function readFile(path) {
	return new Promise(res => {
		Electron_FS.readFile(path, (err, data) => {

			if (data === undefined) {
				return res({ 
					ok: false,
					err: new Err(`Failed to read the file '${path}'`, err)
				});
			}

			res({
				ok: true,
				data
			});
		})
	});
}

/**
 * Synchronously read a file from the given path. Returns a result for errors.
 * 
 * @param {string} path
 * @returns {Result<Buffer>}
 */
export function readFileSync(path) {
	try {
		return {
			ok: true,
			data: Electron_FS.readFileSync(path)
		};
	} catch (err) {
		return {
			ok: false,
			err: new Err(`Failed to read the file at "${path}"`, err)
		};
	}
}

/**
 * Promise version of `Electron_FS.readdir`.
 * @param {string} path 
 * @returns {Promise<Result<string[]>>}
 */
export function readdir(path) {
	return new Promise(res => {
		Electron_FS.readdir(path, (err, data) => {
			
			if (data === undefined) {
				return res({ 
					ok: false,
					err: new Err(`Failed to read contents of the directory '${path}'`, err)
				});
			}

			res({ 
				ok: true,
				data
			});
		})
	});
}

/**
 * Create the given directory.
 * 
 * @param {string} path  Path to the directory to create.
 * @param {boolean} recursive Whether to recursively create directories if the parent does not exist.
 * @returns {Promise<Result<void>>}
 */
export function mkdir(path, recursive) {
	return new Promise(res => {
		Electron_FS.mkdir(path, { recursive }, (err) => {

			console.warn(err)
			
			if (err === null) {
				return res({ ok: true });
			}

			return res({
				ok: false,
				err: new Err(`Failed to create the directory '${path}'`, err)
			});

		});
	});
}

/**
 * Promise version of `Electron_FS.writeFile`.
 * @param {string} path 
 * @param {string} data
 * @returns {Promise<Result<void>>}
 */
export function writeFile(path, data) {
	return new Promise(res => {
		Electron_FS.writeFile(path, data, (err) => {
			if (err !== undefined) {
				return res({
					ok: false,
					err: new Err(`Failed to write the file '${path}'`, err)
				});
			}

			res({ ok: true });
		})
	});
}
