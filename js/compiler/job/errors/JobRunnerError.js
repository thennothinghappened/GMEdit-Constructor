import * as ui from '../../../ui/ui-wrappers.js';

/** 
 * An error that occurred at runtime.
 * @type {JobErrorDescriptor} 
 */
export const JobRunnerError = {

	/**
	 * Some silly regex that captures an error in either the 2024.400<= or 2024.600+ format, since
	 * they randomly changed it ever-so-slightly.
	 */
	regex: /ERROR!!! :: #+?\nERROR in\saction number 1\sof (?<event>[A-Za-z0-9 ]+?)\sfor object (?<object>\S+?):\n+(?<exception>[\s\S]+?)\n#+?\n(?<script>gml_\S+?) \(line (?<line_number>[0-9]+?)\)/,

	asHTML: ({ event, object, line_number, script, exception }) => {
		
		const fragment = new DocumentFragment();
		const group = ui.group(fragment, 'Runner Error');

		const blurb = document.createElement('p');
		blurb.append('In the event ', ui.b(event), ' for object ', ui.code(object), ',');
		blurb.appendChild(document.createElement('br'));
		blurb.append('On line ', ui.b(line_number), ' of script ', ui.code(script), ':');

		group.appendChild(blurb);

		const stacktrace = document.createElement('pre');
		stacktrace.textContent = exception;

		group.appendChild(stacktrace);

		return fragment;

	},

	asString: ({ event, object, line_number, script, exception }) => {

return `Runner Error:

On line ${line_number} of script ${script},
In ${event} of object ${object}:

${exception}`;

	}

};

