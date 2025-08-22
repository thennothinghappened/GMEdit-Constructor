import test from 'node:test';
import assert from 'node:assert';
import { assertErr, assertOk } from '../../index.js';
import { MockDiskIO } from './MockDiskIO.js';
import * as nodePath from 'node:path';

test.suite('MockDiskIO', () => {
	/** @type {DiskIO} */
	let diskIO;

	test.beforeEach(() => {
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
