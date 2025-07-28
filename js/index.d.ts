import { ConstructorPlugin } from './ConstructorPlugin';
import { ProjectProperties } from './preferences/ProjectProperties';
import { ConfigTreeUi } from './ui/ConfigTreeUi';
import { SidebarLogDisplay } from './ui/job-output/SidebarLogDisplay';
import { ProjectPropertiesMenu } from './ui/ProjectPropertiesMenu';
import { BaseError } from './utils/Err';

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
		destroy(): void;

	};

	/**
	 * A method of reporting errors to users.
	 * 
	 * The methods here are to be used in cases where the user needs to be informed of some error,
	 * generally configuration-related and requiring their input, or to report an illegal condition
	 * which the plugin does not know how to resolve.
	 * 
	 * Ideally these methods' usage be minimal, and should generally be avoided at lower levels, in
	 * favour of sending errors upwards for handling. The top-level logic then can make a decision
	 * as to what should happen, which may then be to report it to the user as here, or some other
	 * action.
	 */
	interface ProblemLogger {

		/**
		 * Write an error message in the UI. Error messages implicitly show the problems pane
		 * immediately.
		 * 
		 * @param title
		 * @param err
		 */
		error(title: string, err: BaseError): ProblemLogger;

		/**
		 * Write a warning message in the UI.
		 * 
		 * @param title
		 * @param err
		 */
		warn(title: string, err: BaseError): ProblemLogger;

		/**
		 * Write a debug message in the UI.
		 * 
		 * @param title
		 * @param err
		 */
		debug(title: string, err: BaseError): ProblemLogger;

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
		sidebarLogDisplay?: SidebarLogDisplay;
	};

	/**
	 * Global actions that may be ran by the user.
	 */
	interface PluginCommands {
		showControlPanel(): void;
		stopCurrentProject(): void;
		runCurrentProject(): void;
		cleanCurrentProject(): void;
		packageCurrentProject(): void;
	};

	interface Window {
		ConstructorPlugin?: ConstructorPlugin;
	}

};
