import { ProjectPropertiesMenu } from './ProjectPropertiesMenu';

export declare global {
	namespace UI {

		type Group = HTMLFieldSetElement & {
			legend: HTMLLegendElement;
		};

		/**
		 * A tab in the UI bottom pane.
		 */
		type Tab = {
			/** The name of the tab. Does not have to be unique, but should be. */
			name: string;

			/** The tab's content element. */
			content: HTMLElement;

			/** The tab's content has been resized. Used to notify tab owners. */
			contentResized?(): void;
		};

	};
}
