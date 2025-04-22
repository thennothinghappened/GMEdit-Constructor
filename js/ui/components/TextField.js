
/**
 * A text input in the UI.
 * @implements {UI.Widget}
 */
export class Input {

	/**
	 * @readonly
	 */
	element = document.createElement('label');

	/**
	 * @private
	 * @readonly
	 */
	input = document.createElement('input');

	/**
	 * @param {string} label 
	 * @param {string} initialValue 
	 * @param {(value: string) => void} onValueChanged 
	 */
	constructor(label, initialValue, onValueChanged) {

		const labelSpan = document.createElement('span');
		labelSpan.textContent = label;
		
		this.element.appendChild(labelSpan);
		this.element.appendChild(this.input);
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
	 * @param {boolean} enabled 
	 */
	enable(enabled) {
		this.input.disabled = !enabled;
		return this;
	}

	/**
	 * @param {boolean} visible
	 */
	visible(visible) {
		this.element.hidden = !visible;
		return this;
	}

	/**
	 * @param {string} text 
	 * @returns {this}
	 */
	tooltip(text) {
		this.element.title = text;
		return this;
	}

	/**
	 * @param {boolean} hasError
	 */
	hasError(hasError) {
		
		if (hasError) {
			this.element.classList.add('error');
		} else {
			this.element.classList.remove('error');
		}

		return this;
	}

	/**
	 * @param {HTMLElement} parent
	 * @returns {this}
	 */
	appendTo(parent) {
		parent.appendChild(this.element);
		return this;
	}

}
