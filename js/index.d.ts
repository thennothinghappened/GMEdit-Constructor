import { GMConstructor } from './GMConstructor';
import { ProjectProperties } from './preferences/ProjectProperties';
import { ConfigTreeUi } from './ui/ConfigTreeUi';
import { ProjectPropertiesMenu } from './ui/preferences/ProjectPropertiesMenu';

export declare global {

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

	/**
	 * Project format type for the loaded project.
	 */
	type ProjectFormat =
		'[Unsupported]'			|
		SupportedProjectFormat	;

	/**
	 * Project format type for a loaded project which is supported by the plugin.
	 */
	type SupportedProjectFormat =
		'2023.11'		|
		'2024.2'		|
		'2024.4'		|
		'2024.6'		|
		'2024.8'		|
		'2024.11'		|
		'2024.13+'		;

	type ProjectYY = {

		configs: ProjectYYConfig;

		MetaData: {
			IDEVersion: string
		};

	} & YYFile;

	type YYFile = {
		resourceVersion?: string;
		resourceType: string;
	};

	type ProjectYYConfig = {
		children: ProjectYYConfig[];
		name: string;
	}

	type UIGroup = { 
		legend: HTMLLegendElement;
	} & HTMLFieldSetElement;

	interface Window {
		GMConstructor?: GMConstructor;
	}

};
