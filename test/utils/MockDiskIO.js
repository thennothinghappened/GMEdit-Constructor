import * as nodePath from 'node:path';
import { Err, Ok } from '../../js/utils/Result.js';
import { BaseError } from '../../js/utils/Err.js';
import assert from 'node:assert';
import test from 'node:test';
import { inspect } from 'node:util';

/**
 * @implements {DiskIO}
 */
export class MockDiskIO {
	/**
	 * 
	 * @param {import('./index.js').MockDiskDirectory['entries']} rootEntries 
	 */
	constructor(rootEntries) {
		/** @type {import('./index.js').MockDiskDirectory} */
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
	 * @private
	 * @param {string} path 
	 * @returns {import('./index.js').MockDiskNode|undefined}
	 */
	traverse(path) {
		const segments = path.split(nodePath.sep);
		let node = this.disk;

		while (segments.length > 0) {
			const segment = /** @type {string} */ (segments.shift());
			const nextNode = node.entries[segment];

			if (nextNode === undefined) {
				// Path doesn't exist!
				return undefined;
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
	 * @param {import('./index.js').MockDiskDirectory['entries']} entries 
	 * @returns {import('./index.js').MockDiskDirectory}
	 */
	static dir(entries) {
		return { type: 'directory', entries };
	}

	/**
	 * @returns {import('./index.js').MockDiskFile}
	 */
	static file() {
		return { type: 'file' };
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
	const diskIO = new MockDiskIO({
		'some-file': MockDiskIO.file(),
		'stuff': MockDiskIO.dir({
			'nested-file': MockDiskIO.file(),
			'nested-directory': MockDiskIO.dir({
				'double-nested-file': MockDiskIO.file()
			})
		})
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
});
