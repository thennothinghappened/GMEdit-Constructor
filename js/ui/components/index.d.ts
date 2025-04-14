import { InvalidStateErr } from '../../utils/Err';
import { DropdownEntry } from './Dropdown';

export declare global {
	namespace Components {

		type NormalizedDropdownEntry<T> =  {
			label: string;
			value: T;
		};

		type DropdownEntry<T> = (T extends string 
			? (T | NormalizedDropdownEntry<T>)
			: (NormalizedDropdownEntry<T>)
		);
		
		/**
		 * A dropdown from which one element can be selected.
		 * 
		 * FIXME: the TS LSP refuses to narrow types when I used the `@template` JSDoc tag, so I had
		 * to chuck this interface in here. I don't really know why!
		 */
		interface IDropdown<T> {

			/**
			 * The root element of this dropdown, to be attached to the document.
			 */
			element: HTMLElement;

			/**
			 * Get the currently selected option.
			 * @returns The selected option or {@link None} if the list is empty.
			 */
			getSelectedOption(): Option<T>;

			/**
			 * Set the currently selected option.
			 * @param choice The newly chosen option.
			 */
			setSelectedOption(choice: T);
		
			/**
			 * Update the list of choices to a new list.
			 * @param choices The new list of choices. The list must be non-empty.
			 */
			setOptions(choices: ReadonlyArray<DropdownEntry<T>>);

		}

	}
}
