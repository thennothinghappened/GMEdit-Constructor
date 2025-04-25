import { ProjectPropertiesMenu } from './ProjectPropertiesMenu';

export declare global {
	namespace UI {

		type Group = HTMLFieldSetElement & {
			legend: HTMLLegendElement;
		};

	};
}
