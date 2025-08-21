import assert from 'assert';
import test from 'node:test';
import { docString } from '../../js/utils/StringUtils.js';

test('docString basic passthru', () => {
	assert.equal(docString('some random text'), 'some random text');
});

test('docString remove leading and trailing newlines', () => {
	assert.equal(docString('\nsome random text\n'), 'some random text');
});

test('docString trim indentation', () => {
	assert.equal(docString(`
		some random text
			and some more text, more indented
		and yet more, less indented
	`), 'some random text\n    and some more text, more indented\nand yet more, less indented');
});
