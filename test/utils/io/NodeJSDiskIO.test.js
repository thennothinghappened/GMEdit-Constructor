import test from 'node:test';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { NodeJSDiskIO } from '../../../js/utils/io/NodeJSDiskIO.js';
import path from 'node:path';
import { assertOk } from '../../index.js';

const pathToThisFile = fileURLToPath(import.meta.url);

test.suite('NodeJSDiskIO', () => {

	/** @type {DiskIO} */
	let diskIO;

	test.beforeEach(() => {
		diskIO = new NodeJSDiskIO(path.join, fs);
	});

	test('reading this file', async () => {
		/** @type {string} */
		const comparisonContent = await new Promise(resolve => {
			fs.readFile(pathToThisFile, (err, data) => {
				assert.equal(err, null);
				assert.notEqual(data, null);

				resolve(data.toString());
			});
		});

		const result = await diskIO.readFile(pathToThisFile);

		assertOk(result);
		assert.equal(result.data, comparisonContent);
	});

});
