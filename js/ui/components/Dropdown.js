import { InvalidStateErr } from '../../utils/Err.js';

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
	onChoiceChanged;

	/**
	 * @param {string} label Textual label for this dropdown.
	 * @param {T} initialChoice The initial selection.
	 * @param {(value: T) => void} onChoiceChanged Callback when the selected choice is changed.
	 * @param {NonEmptyArray<Components.DropdownEntry<T>>} choices The initial list of choices.
	 */
	constructor(label, initialChoice, onChoiceChanged, choices) {

		this.label.textContent = label;

		this.element.appendChild(this.label);
		this.element.appendChild(this.select);
		this.element.classList.add('select');

		this.choiceList = choices;
		this.choice = initialChoice;

		this.onChoiceChanged = onChoiceChanged;
		this.select.addEventListener('change', () => this.onChoiceChanged(this.choice));

	}

	get choice() {

		const choiceIndex = this.select.selectedIndex;
		
		if (choiceIndex < 0) {
			throw new InvalidStateErr('No choice can be selected in an empty list!');
		}
		
		return this.choiceValuesByIds[choiceIndex];

	}

	set choice(newValue) {

		for (const [index, value] of this.choiceValuesByIds.entries()) {
			if (value === newValue) {
				this.select.selectedIndex = index;
				return;
			}
		}

		throw new InvalidStateErr(`Choice '${newValue}' is not a valid option in the list [${this.choiceValuesByIds.join(', ')}]`);

	}

	/**
	 * Update the list of choices to a new list.
	 * @param {NonEmptyArray<Components.DropdownEntry<T>>} choices The new list of choices.
	 */
	set choiceList(choices) {

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

		if (this.select.selectedIndex < 0) {
			// No choices matched, so fallback to the first option.
			this.select.selectedIndex = 0;
			this.onChoiceChanged(this.choice);
		}

	}

}
