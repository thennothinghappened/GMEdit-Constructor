import { ConstructorPlugin } from './ConstructorPlugin';
import { ProjectProperties } from './preferences/ProjectProperties';
import { ConfigTreeUi } from './ui/ConfigTreeUi';
import { ProjectPropertiesMenu } from './ui/ProjectPropertiesMenu';

export declare global {

	/**
	 * Some object which requires special logic to be properly destroyed when it is no longer
	 * required.
	 */
	interface Destroyable {

		/**
		 * Destroy this object.
		 * 
		 * This method is safe to call more than once.
		 */
		destroy();

	};

	/**
	 * Components held by the plugin singleton for the currently open project.
	 */
	type ProjectComponents = {
		project: GMEdit.Project;
		projectProperties: ProjectProperties;
		projectPropertiesMenuComponents?: {
			group: HTMLFieldSetElement;
			projectPropertiesMenu: ProjectPropertiesMenu;
		};
		configTreeUi: ConfigTreeUi;
	};

	type UIGroup = { 
		legend: HTMLLegendElement;
	} & HTMLFieldSetElement;

	interface Window {
		ConstructorPlugin?: ConstructorPlugin;
	}

};
