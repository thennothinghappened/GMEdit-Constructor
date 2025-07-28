import { InvalidStateErr } from '../../utils/Err';
import { DropdownEntry } from './Dropdown';

export declare global {
	namespace UI {

		interface Widget {

			/**
			 * Set whether this widget should be enabled.
			 */
			enable(enabled: boolean): this;

			/**
			 * Set whether this widget should be visible.
			 */
			visible(visible: boolean): this;

			/**
			 * Specify a tooltip for the user when hovering this widget.
			 * @param text The tooltip text for the widget.
			 */
			tooltip(text: string): this;

			/**
			 * Set whether this widget is in an error condition.
			 */
			hasError(hasError: boolean): this;

			/**
			 * Append this widget to the given element.
			 * @param parent The parent element to be appended to.
			 */
			appendTo(parent: HTMLElement): this;

		};
		
		/**
		 * A dropdown from which one element can be selected.
		 * 
		 * FIXME: the TS LSP refuses to narrow types when I used the `@template` JSDoc tag, so I had
		 * to chuck this interface in here. I don't really know why!
		 */
		interface Dropdown<T> extends Widget {

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
			 * 
			 * @param choices The new list of choices. The list must be non-empty.
			 * @param selectedChoice The new selected choice.
			 */
			setOptions(
				choices: ReadonlyArray<Dropdown.Entry<T>>,
				selectedChoice: T
			);

		};

		namespace Dropdown {
	
			type Entry<T> = (T extends string 
				? (T | NormalizedEntry<T>)
				: (NormalizedEntry<T>)
			);

			type NormalizedEntry<T> =  {
				label: string;
				value: T;
			};

		};

	}
}
