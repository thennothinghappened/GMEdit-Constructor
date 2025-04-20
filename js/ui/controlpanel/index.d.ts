import { BaseError } from '../../utils/Err';
import { PreferencesMenu } from '../preferences/PreferencesMenu';
import { ProjectPropertiesMenu } from '../preferences/ProjectPropertiesMenu';

export declare global {

	interface ControlPanel extends ProblemLogger, Destroyable {

		/**
		 * Open the control panel.
		 */
		open();

		/**
		 * Provide the project properties menu to be shown on the control panel, when it should be
		 * shown for the relevant project.
		 */
		setProjectPropertiesMenu(projectPropertiesMenu: ProjectPropertiesMenu);

		/**
		 * Remove the project properties menu, as it should no longer be shown.
		 */
		clearProjectPropertiesMenu();

	};

	namespace ControlPanel {
		
		type Problem = {
			severity: ProblemSeverity;
			title: string;
			err: BaseError;
		};

		type ProblemSeverity =
			'error'		|
			'warning'	|
			'debug'		;

	};

};
