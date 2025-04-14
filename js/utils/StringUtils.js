
/**
 * Trim leading indentation from the given string, and normalise indents to spaces.
 * 
 * @param {string} string 
 * @param {number} [tabWidth=4]
 * @returns {string}
 */
export function trimIndent(string, tabWidth = 4) {

	const lines = string
		.replaceAll('\t', ' '.repeat(tabWidth))
		.split('\n');

	let maxTrimCount = Infinity;

	for (const line of lines) {

		const indentCount = line.search(/\S/);

		if (indentCount >= 0 && indentCount < maxTrimCount) {
			maxTrimCount = indentCount;
		}
		
	}

	const trimString = ' '.repeat(maxTrimCount);

	return lines.map(line => {

		if (line.trim() === '') {
			return '';
		}

		if (line.startsWith(trimString)) {
			return line.substring(maxTrimCount);
		}

		return line;

	}).join('\n');

}

/**
 * Correct formatting of a multi-line string, removing single-newlines, and trimming whitespace up
 * to the indent level.
 * 
 * @param {string} string 
 * @returns {string}
 */
export function docString(string) {
	
	/** @type {string[]} */
	const output = [''];
	let previousIndentLevel = 0;
	let lastLineWasText = false;

	for (let line of trimIndent(string).replace(/^\n+/g, '').trimEnd().split('\n')) {
		
		if (line.trim() === '') {
			output.push('\n');
			lastLineWasText = false;

			continue;
		}

		const newIndentLevel = line.search(/\S/);

		if (newIndentLevel !== previousIndentLevel) {
			previousIndentLevel = newIndentLevel;
			lastLineWasText = false;

			output.push('');
		}

		if (lastLineWasText) {
			line = ' ' + line;
		}
		
		output[output.length - 1] += line;
		lastLineWasText = true;
		
	}

	return output.join('\n');

}
