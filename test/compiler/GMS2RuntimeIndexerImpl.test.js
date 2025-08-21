import test from 'node:test';
import { MockDiskIO } from '../utils/MockDiskIO.js';
import { GMS2RuntimeIndexerImpl } from '../../js/compiler/GMS2RuntimeIndexerImpl.js';
import { assertOk } from '../index.js';
import assert from 'node:assert';
import { HOST_PLATFORM_EXECUTABLE_EXTENSION, HOST_PLATFORM_PLATFORM_PATH_NAME } from '../../js/compiler/igor-paths.js';
import { GMRuntimeVersion } from '../../js/compiler/GMVersion.js';
import { inspect } from 'node:util';

test.suite('GMS2RuntimeIndexerImpl', () => {

	function validRuntimeDirectory() {
		return MockDiskIO.dir({
			'bin': MockDiskIO.dir({
				'igor': MockDiskIO.dir({
					[HOST_PLATFORM_PLATFORM_PATH_NAME]: MockDiskIO.dir({
						[process.arch]: MockDiskIO.dir({
							[`Igor${HOST_PLATFORM_EXECUTABLE_EXTENSION}`]: MockDiskIO.file()
						})
					})
				})
			})
		});
	}

	test('parsing and listing runtimes in a directory', async () => {

		/** @type {DiskIO} */
		const diskIO = new MockDiskIO({
			'runtimes': MockDiskIO.dir({
				'.DS_Store': MockDiskIO.file(),
				'thumbs.db': MockDiskIO.file(),
				'runtime-2024.11.0.0': validRuntimeDirectory(),
				'runtime-2022.0.3.98': validRuntimeDirectory(),
				'runtime-2024.400.0.0': validRuntimeDirectory(),
			})
		});

		const indexer = new GMS2RuntimeIndexerImpl(diskIO);
		const result = await indexer.getRuntimes('runtimes');

		assertOk(result);
		
		const { runtimes, invalidRuntimes } = result.data;
		
		assert.deepEqual(runtimes, [
			{
				version: new GMRuntimeVersion(2024, 11, 0, 0),
				path: diskIO.joinPath('runtimes', 'runtime-2024.11.0.0'),
				igorPath: diskIO.joinPath('runtimes', 'runtime-2024.11.0.0', 'bin', 'igor', HOST_PLATFORM_PLATFORM_PATH_NAME, process.arch, 'Igor' + HOST_PLATFORM_EXECUTABLE_EXTENSION)
			},
			{
				version: new GMRuntimeVersion(2024, 400, 0, 0),
				path: diskIO.joinPath('runtimes', 'runtime-2024.400.0.0'),
				igorPath: diskIO.joinPath('runtimes', 'runtime-2024.400.0.0', 'bin', 'igor', HOST_PLATFORM_PLATFORM_PATH_NAME, process.arch, 'Igor' + HOST_PLATFORM_EXECUTABLE_EXTENSION)
			},
			{
				version: new GMRuntimeVersion(2022, 0, 3, 98),
				path: diskIO.joinPath('runtimes', 'runtime-2022.0.3.98'),
				igorPath: diskIO.joinPath('runtimes', 'runtime-2022.0.3.98', 'bin', 'igor', HOST_PLATFORM_PLATFORM_PATH_NAME, process.arch, 'Igor' + HOST_PLATFORM_EXECUTABLE_EXTENSION)
			}
		]);

		assert.equal(invalidRuntimes.length, 0);
		
	});

});
