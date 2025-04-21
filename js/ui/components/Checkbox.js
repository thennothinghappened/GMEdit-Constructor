
/**
 * A true or false checkbox.
 * @implements {UI.Widget}
 */
export class Checkbox {

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
	 * @param {string} label 
	 * @param {boolean} initialValue 
	 * @param {(value: boolean) => void} onValueChanged 
	 */
	constructor(label, initialValue, onValueChanged) {

		this.label.appendChild(this.input);
		this.label.append(label);

		this.element.appendChild(this.label);
		this.element.classList.add('checkbox');

		this.value = initialValue;

		this.input.type = 'checkbox';
		this.input.addEventListener('change', () => onValueChanged(this.value));

	}

	/**
	 * The current checked state.
	 * @returns {boolean}
	 */
	get value() {
		return this.input.checked;
	}

	set value(value) {
		this.input.checked = value;
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
	 * @param {HTMLElement} parent
	 * @returns {this}
	 */
	appendTo(parent) {
		parent.appendChild(this.element);
		return this;
	}

}
