import * as nodePath from 'node:path';
import { Err, Ok } from '../../../js/utils/Result.js';
import { BaseError } from '../../../js/utils/Err.js';
import assert from 'node:assert';
import test, { beforeEach } from 'node:test';
import { assertErr, assertOk } from '../../index.js';

/**
 * @implements {DiskIO}
 */
export class MockDiskIO {
	/**
	 * @param {import('../index.js').MockDiskDirectory['entries']} rootEntries 
	 */
	constructor(rootEntries) {
		/** @type {import('../index.js').MockDiskDirectory} */
		this.disk = {
			type: 'directory',
			entries: rootEntries
		};
	}

	/**
	 * @type {DiskIO['isDirectorySync']}
	 */
	isDirectorySync(path) {
		return this.traverse(path)?.type === 'directory';
	}

	/**
	 * @type {DiskIO['existsSync']}
	 */
	existsSync(path) {
		return this.traverse(path) !== undefined;
	}

	/**
	 * @type {DiskIO['readDir']}
	 */
	readDir(path) {
		const node = this.traverse(path);

		if (node === undefined) {
			return Promise.resolve(Err(new BaseError(`The file '${path}' does not exist`)));
		}

		if (node.type !== 'directory') {
			return Promise.resolve(Err(new BaseError(`The file '${path}' is not a directory`)));
		}

		return Promise.resolve(Ok(Object.keys(node.entries)));
	}

	/**
	 * @type {DiskIO['readFile']}
	 */
	readFile(path) {
		return Promise.resolve(this.readFileSync(path));
	}

	/**
	 * @type {DiskIO['readFileSync']}
	 */
	readFileSync(path) {
		const node = this.traverse(path);

		if (node === undefined) {
			return Err(new BaseError(`The file at path '${path}' does not exist`));
		}

		if (node.type !== 'file') {
			return Err(new BaseError(`The file at path '${path}' is not a readable file, actual type is ${node.type}`));
		}

		return Ok(Buffer.from(node.data));
	}

	/**
	 * @type {DiskIO['createDir']}
	 */
	createDir(path, recursive) {
		return Promise.resolve(this.createDirSync(path, recursive));
	}

	/**
	 * @private
	 * @param {string} path 
	 * @param {boolean} recursive 
	 * @returns {Result<void>}
	 */
	createDirSync(path, recursive) {
		const dir = this.traverse(path, (isFinalSegment) => {
			if (recursive || isFinalSegment) {
				return MockDiskIO.dir({});
			} else {
				return undefined;
			}
		});

		if (dir === undefined) {
			return Err(new BaseError('Failed to create the directory'));
		}

		if (dir.type !== 'directory') {
			return Err(new BaseError(`A node of type ${dir.type} already exists at the path`));
		}

		return Ok(undefined);
	}

	/**
	 * @type {DiskIO['writeFile']}
	 */
	writeFile(path, data) {
		return Promise.resolve(this.writeFileSync(path, data));
	}

	/**
	 * @type {DiskIO['writeFileSync']}
	 */
	writeFileSync(path, data) {
		const file = this.traverse(path, (isFinalSegment) => {
			if (isFinalSegment) {
				return MockDiskIO.file();
			}
		});

		if (file === undefined) {
			return Err(new BaseError('Failed to create the file'));
		}

		if (file.type !== 'file') {
			return Err(new BaseError(`A node of type ${file.type} already exists at the path`));
		}

		file.data = data;
		return Ok(undefined);
	}

	/**
	 * @private
	 * @param {string} path
	 * @param {(isFinalSegment: boolean) => import('../index.js').MockDiskNode|undefined} [nodeSupplier] Optional function to create missing nodes during traversal.
	 * @returns {import('../index.js').MockDiskNode | undefined}
	 */
	traverse(path, nodeSupplier) {
		const segments = this.splitPath(path);
		let node = this.disk;

		while (segments.length > 0) {
			const segment = /** @type {string} */ (segments.shift());
			let nextNode = node.entries[segment];

			if (nextNode === undefined) {
				if (nodeSupplier === undefined) {
					return undefined;
				}

				nextNode = nodeSupplier(segments.length === 0);
				
				if (nextNode === undefined) {
					return undefined;
				}

				node.entries[segment] = nextNode;
			}

			if (segments.length === 0) {
				// Got it!
				return nextNode;
			}

			if (nextNode.type !== 'directory') {
				// Not a directory, but we were asked to query inside it - not valid!
				return undefined;
			}

			node = nextNode;
		}
	}

	/**
	 * @param {import('../index.js').MockDiskDirectory['entries']} entries 
	 * @returns {import('../index.js').MockDiskDirectory}
	 */
	static dir(entries) {
		return { type: 'directory', entries };
	}

	/**
	 * @param {string} [data]
	 * @returns {import('../index.js').MockDiskFile}
	 */
	static file(data = '') {
		return { type: 'file', data };
	}

	/**
	 * @private
	 * @param {string} path 
	 * @returns {string[]}
	 */
	splitPath(path) {
		return path.split(nodePath.sep);
	}

	/**
	 * Extremely basic implementation of Node's `path.join()` that doesn't care if the path really
	 * exists on disk.
	 * 
	 * @type {DiskIO['joinPath']}
	 */
	joinPath(...paths) {
		for (const path of paths) {
			assert.equal(typeof path, 'string', 'All path segments must be strings');
		}

		return paths.join(nodePath.sep);
	}
}

test.suite('MockDiskIO', () => {
	/** @type {DiskIO} */
	let diskIO;

	beforeEach(() => {
		diskIO = new MockDiskIO({
			'some-file': MockDiskIO.file(),
			'stuff': MockDiskIO.dir({
				'nested-file': MockDiskIO.file(),
				'nested-directory': MockDiskIO.dir({
					'double-nested-file': MockDiskIO.file()
				})
			})
		});
	});

	test('path joined correctly', () => {
		assert.equal(diskIO.joinPath('a', 'b', 'c'), `a${nodePath.sep}b${nodePath.sep}c`);
	});

	test('invalid path components error', () => {
		assert.throws(() => {
			// @ts-expect-error Intentionally passing illegal args.
			diskIO.joinPath('a', 'b', undefined, 'd');
		});
	});

	test('top-level file exists', () => {
		assert(diskIO.existsSync('some-file'));
	});

	test('top-level directory is a directory', () => {
		assert(diskIO.isDirectorySync('stuff'));
	});

	test('top-level file is not a directory', () => {
		assert(!diskIO.isDirectorySync('some-file'));
	});

	test('nested file exists', () => {
		assert(diskIO.existsSync(diskIO.joinPath('stuff', 'nested-file')));
	});

	test('double-nested file exists', () => {
		assert(diskIO.existsSync(diskIO.joinPath('stuff', 'nested-directory', 'double-nested-file')));
	});

	test('creating directory', async () => {
		assertOk(await diskIO.createDir('level1', false));
		assert(diskIO.isDirectorySync('level1'));
	});

	test('creating nested directory recursively', async () => {
		assertOk(await diskIO.createDir(diskIO.joinPath('level1', 'level2', 'level3'), true));
		assert(diskIO.isDirectorySync(diskIO.joinPath('level1', 'level2', 'level3')));
	});

	test('creating nested directory recursively without recursive flag fails', async () => {
		assertErr(await diskIO.createDir(diskIO.joinPath('level1', 'level2', 'level3'), false));
		assert(!diskIO.isDirectorySync(diskIO.joinPath('level1', 'level2', 'level3')));
	});

	test('creating file', async () => {
		const path = diskIO.joinPath('new-file');

		assertOk(await diskIO.writeFile(path, 'hi!'));
		assert(diskIO.existsSync(path));
	});

	test('overwriting an existing file', async () => {
		const path = diskIO.joinPath('some-file');

		assert(diskIO.existsSync(path));
		assertOk(await diskIO.writeFile(path, 'hi!'));
		assert(diskIO.existsSync(path));
	});
});
