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
	 * A method of comparing two instances of `T`, if they are complex types.
	 * 
	 * @private
	 * @param {NonNullable<T>} a 
	 * @param {NonNullable<T>} b 
	 * @returns {boolean}
	 */
	equals = (a, b) => a === b;

	/**
	 * @param {string} label Textual label for this dropdown.
	 * @param {Option<T>} initialSelected The initial selection.
	 * @param {(value: T) => void} onSelectedChanged Callback when the selected choice is changed.
	 * @param {ReadonlyArray<Components.DropdownEntry<T>>} options The initial list of choices.
	 * @param {(a: NonNullable<T>, b: NonNullable<T>) => boolean} [equals] A method of comparing two instances of `T`, if `T` is a complex type.
	 */
	constructor(label, initialSelected, onSelectedChanged, options, equals) {

		if (equals !== undefined) {
			this.equals = equals;
		}

		this.label.textContent = label;

		this.element.appendChild(this.label);
		this.element.appendChild(this.select);
		this.element.classList.add('select');

		this.setOptionsInternal(options);

		if (isSome(initialSelected)) {
			this.setSelectedOption(initialSelected.data);
		}

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
			
			if (choice == undefined || value == undefined) {
				if (choice === value) {
					this.select.selectedIndex = index;
					return;
				}
				
				continue;
			}

			if (this.equals(choice, value)) {
				this.select.selectedIndex = index;
				return;
			}

		}

		throw new InvalidStateErr(`Choice '${choice}' is not a valid option in the list [${this.choiceValuesByIds.join(', ')}]`);

	}

	/**
	 * @param {ReadonlyArray<Components.DropdownEntry<T>>} choices The new list of choices. The list must be non-empty.
	 * @param {T} selectedChoice
	 */
	setOptions(choices, selectedChoice) {
		this.setOptionsInternal(choices);
		this.setSelectedOption(selectedChoice);
	}

	/**
	 * @private
	 * @param {ReadonlyArray<Components.DropdownEntry<T>>} choices The new list of choices.
	 */
	setOptionsInternal(choices) {

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

			this.select.appendChild(option);
			nextChoiceId++;

		}

	}

}
