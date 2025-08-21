import assert from 'assert';
import test from 'node:test';
import { docString } from '../../js/utils/StringUtils.js';

test.describe('docString', () => {
	test.it('passes a string unmodified', () => {
		assert.equal(docString('some random text'), 'some random text');
	});
	
	test.it('removes leading and trailing newlines', () => {
		assert.equal(docString('\nsome random text\n'), 'some random text');
	});

	test.it('trims indentation', () => {
		assert.equal(docString(`
			some random text
				and some more text, more indented
			and yet more, less indented
		`), 'some random text\n    and some more text, more indented\nand yet more, less indented');
	});
})
