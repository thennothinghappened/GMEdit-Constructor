import test from 'node:test';
import { GMVersion } from '../../js/compiler/GMVersion.js';
import { assertErr, assertOk } from '../index.js';
import assert from 'node:assert';

test.suite('GMVersion', () => {
	test('parsing stable IDE version', () => {
		const result = GMVersion.parse('2023.11.1.160');
		assertOk(result);

		const version = result.data;
		assert.equal(version.year, 2023);
		assert.equal(version.month, 11);
		assert.equal(version.revision, 1);
		assert.equal(version.build, 160);
	});

	test('parsing beta IDE version', () => {
		const result = GMVersion.parse('2024.1400.0.866');
		assertOk(result);

		const version = result.data;
		assert.equal(version.year, 2024);
		assert.equal(version.month, 1400);
		assert.equal(version.revision, 0);
		assert.equal(version.build, 866);
	});

	test('parsing invalid IDE version', () => {
		const result = GMVersion.parse('2024.11.0.0-');
		assertErr(result);
	});
});

