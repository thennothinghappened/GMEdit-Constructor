import assert from 'node:assert';
import { inspect } from 'node:util';

/**
 * @type {import('index.d.ts').assertOk}
 */
export function assertOk(result) {
	if (result.ok) {
		return;
	}

	return assert.fail(`The result was not Ok, got Err(${inspect(result.err)})`);
}

/**
 * @type {import('index.d.ts').assertErr}
 */
export function assertErr(result) {
	if (!result.ok) {
		return;
	}

	if ('data' in result) {
		return assert.fail(`The result was not Err, got Ok(${inspect(result.data)})`);
	} else {
		return assert.fail(`The result was not Err, got Ok(void)`);
	}
}
