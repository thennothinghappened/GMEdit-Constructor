
const OUTPUT_TAB_NAME = 'Constructor Output';
const ERRORS_TAB_NAME = 'Constructor Errors';

/**
 * @implements {UI.OutputLogDisplay}
 */
export class SidebarLogDisplay {
	/**
	 * @private
	 * @type {UI.OutputLogDisplay.Client|undefined}
	 */
	client = undefined;

	/**
	 * @private
	 */
	logTabElement = document.createElement('div');

	/**
	 * @private
	 * @type {HTMLDivElement|undefined}
	 */
	errorsTabElement = undefined;

	constructor() {
		this.logTabElement.classList.add('gm-constructor-tab', 'gm-constructor-viewer', 'popout-window');
		GMEdit.sidebar.add(OUTPUT_TAB_NAME, this.logTabElement);
	}

	destroy() {
		this.client?.displayClosed();

		GMEdit.sidebar.remove(OUTPUT_TAB_NAME);
		GMEdit.sidebar.remove(ERRORS_TAB_NAME);
	}

	/**
	 * @type {UI.OutputLogDisplay['getClient']}
	 */
	getClient() {
		return this.client;
	}

	/**
	 * @type {UI.OutputLogDisplay['connect']}
	 */
	connect(client) {
		if (this.client !== undefined) {
			this.disconnect();
		}

		this.client = client;
		this.logTabElement.prepend(client.getContent());
	}

	/**
	 * @type {UI.OutputLogDisplay['disconnect']}
	 */
	disconnect() {
		if (this.client === undefined) {
			return;
		}

		this.logTabElement.textContent = '';

		if (this.errorsTabElement !== undefined) {
			this.errorsTabElement.textContent = '';
		}

		this.client.displayClosed();
		this.client = undefined;
	}

	/**
	 * @type {UI.OutputLogDisplay['bringToForeground']}
	 */
	bringToForeground() {
		GMEdit.sidebar.set(OUTPUT_TAB_NAME);
	}

	/**
	 * @type {UI.OutputLogDisplay['supportsTitle']}
	 */
	supportsTitle() {
		return false;
	}

	/**
	 * @type {UI.OutputLogDisplay['setTitle']}
	 */
	setTitle(_title) {}

	/**
	 * @type {UI.OutputLogDisplay['addError']}
	 */
	addError(error) {
		if (this.errorsTabElement === undefined) {
			this.errorsTabElement = document.createElement('div');
			this.errorsTabElement.classList.add('gm-constructor-tab', 'gm-constructor-viewer-bottom-pane', 'gm-constructor-viewer-errors', 'popout-window');

			GMEdit.sidebar.add(ERRORS_TAB_NAME, this.errorsTabElement);
		}
		
		this.errorsTabElement.appendChild(error.asHTML());
		GMEdit.sidebar.set(ERRORS_TAB_NAME);
	}
}
