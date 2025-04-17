import { BaseError } from '../../utils/Err.js';
import { ControlPanelTab } from './ControlPanelTab.js';

/**
 * Implementation of the error reporter which uses the {@link ControlPanelTab} to show messages, but
 * avoids the dependency on the control panel, should we want to run the plugin headless.
 * 
 * @implements {ProblemLogger}
 */
export class ControlPanelProblemLogger {

	/**
	 * @param {string} title
	 * @param {BaseError} err
	 */
	error(title, err) {
		ControlPanelTab.error(title, err);
		ControlPanelTab.show();
		return this;
	}

	/**
	 * @param {string} title
	 * @param {BaseError} err
	 */
	warn(title, err) {
		ControlPanelTab.warn(title, err);
		return this;
	}
	
	/**
	 * @param {string} title
	 * @param {BaseError} err
	 */
	debug(title, err) {
		ControlPanelTab.debug(title, err);
		return this;
	}

}
