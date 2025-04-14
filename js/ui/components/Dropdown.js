import { InvalidStateErr } from '../../utils/Err.js';
import { isSome, None, Some } from '../../utils/Option.js';

/**
 * @template T The element type held in the dropdown.
 * @implements {Components.IDropdown<T>}
 */
export class Dropdown {

	element = document.createElement('div');

	/**
	 * @private
	 */
	label = document.createElement('label');

	/**
	 * @private
	 */
	select = document.createElement('select');

	/**
	 * @private
	 * @type {T[]}
	 */
	choiceValuesByIds = [];

	/**
	 * @private
	 * @type {(value: T) => void}
	 */
	onSelectChanged;

	/**
	 * @param {string} label Textual label for this dropdown.
	 * @param {T} initialSelected The initial selection.
	 * @param {(value: T) => void} onSelectedChanged Callback when the selected choice is changed.
	 * @param {NonEmptyArray<Components.DropdownEntry<T>>} options The initial list of choices.
	 */
	constructor(label, initialSelected, onSelectedChanged, options) {

		this.label.textContent = label;

		this.element.appendChild(this.label);
		this.element.appendChild(this.select);
		this.element.classList.add('select');

		this.setOptions(options);
		this.setSelectedOption(initialSelected);

		this.onSelectChanged = onSelectedChanged;
		this.select.addEventListener('change', () => {

			const maybe = this.getSelectedOption();

			if (isSome(maybe)) {
				this.onSelectChanged(maybe.data);
			}

		});

	}

	getSelectedOption() {

		const choiceIndex = this.select.selectedIndex;
		
		if (choiceIndex < 0) {
			return None;
		}
		
		return Some(this.choiceValuesByIds[choiceIndex]);

	}

	/**
	 * @param {T} choice
	 */
	setSelectedOption(choice) {

		for (const [index, value] of this.choiceValuesByIds.entries()) {
			if (value === choice) {
				this.select.selectedIndex = index;
				return;
			}
		}

		throw new InvalidStateErr(`Choice '${choice}' is not a valid option in the list [${this.choiceValuesByIds.join(', ')}]`);

	}

	/**
	 * @param {NonEmptyArray<Components.DropdownEntry<T>>} choices The new list of choices. The list must be non-empty.
	 */
	setOptions(choices) {

		// Preserve the current choice, if it is applicable still.
		/** @type {T|undefined} */
		let currentChoice = undefined;

		const currentChoiceIndex = this.select.selectedIndex;
		this.select.selectedIndex = -1;

		if (currentChoiceIndex >= 0) {
			currentChoice = this.choiceValuesByIds[currentChoiceIndex];
		}

		// Remove the existing entries from the list.
		while (this.select.lastChild !== null) {
			this.select.removeChild(this.select.lastChild);
		}

		this.choiceValuesByIds.length = 0;
		
		// The HTML select element uses strings for values. We don't want to enforce `T` to be a
		// `string`, so we use an intermediary mapping (integer IDs).
		let nextChoiceId = 0;

		const normalizedChoices = choices.map(choice => 
			/** @type {Components.NormalizedDropdownEntry<T>} */
			((typeof choice === 'string') ? { label: choice, value: choice } : choice)
		);

		for (const { label, value } of normalizedChoices) {

			this.choiceValuesByIds[nextChoiceId] = value;

			const option = document.createElement('option');
			option.textContent = label;

			if (value === currentChoice) {
				this.select.selectedIndex = currentChoiceIndex;
			}

			this.select.appendChild(option);
			nextChoiceId++;

		}

		if (this.select.selectedIndex < 0 && this.choiceValuesByIds.length > 0) {
			// No choices matched, so fallback to the first option.
			this.select.selectedIndex = 0;
			this.onSelectChanged(this.choiceValuesByIds[0]);
		}

	}

}
