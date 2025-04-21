
/**
 * A text input in the UI.
 */
export class Input {

	/**
	 * @readonly
	 */
	element = document.createElement('div');

	/**
	 * @private
	 * @readonly
	 */
	label = document.createElement('label');

	/**
	 * @private
	 * @readonly
	 */
	input = document.createElement('input');

	/**
	 * 
	 * @param {string} label 
	 * @param {string} initialValue 
	 * @param {(value: string) => void} onValueChanged 
	 */
	constructor(label, initialValue, onValueChanged) {
		
		this.label.textContent = label;

		this.label.appendChild(this.input);
		this.element.appendChild(this.label);
		this.element.classList.add('input');

		this.value = initialValue;

		this.input.type = 'text';
		this.input.addEventListener('change', () => onValueChanged(this.value));

	}

	/**
	 * The current text in the input.
	 * @returns {string}
	 */
	get value() {
		return this.input.value;
	}

	set value(value) {
		this.input.value = value;
	}

	/**
	 * Whether this text input disallows input.
	 * @returns {boolean}
	 */
	get disabled() {
		return this.input.disabled;
	}

	set disabled(value) {
		this.input.disabled = value;
	}

}
