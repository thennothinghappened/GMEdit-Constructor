import { EventEmitterImpl } from '../utils/EventEmitterImpl';
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

			/** Events that can happen to a tab, to notify the tab's owner. */
			events: EventEmitterImpl<TabEventMap>;
		};
		
		interface TabEventMap {
			/** The tab's content has been resized. */
			contentResized: void;

			/** The tab has been closed. After this event, the tab is no longer valid. */
			close: void;
		};

	};
}
