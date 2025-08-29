import { BottomPane } from '../BottomPane.js';

/**
 * @implements {UI.OutputLogDisplay}
 */
export class BottomPaneLogDisplay {
	/**
	 * @private
	 * @type {UI.OutputLogDisplay.Client|undefined}
	 */
	client = undefined;

	/**
	 * @private
	 * @type {UI.Tab}
	 */
	logTab;

	/**
	 * @private
	 * @type {UI.Tab|undefined}
	 */
	errorsTab = undefined;

	/**
	 * @private
	 * @type {BottomPane}
	 */
	bottomPane;

	/**
	 * @private
	 */
	title = '';

	/**
	 * @param {BottomPane} bottomPane
	 */
	constructor(bottomPane) {
		this.bottomPane = bottomPane;

		this.logTab = bottomPane.openTab('Log Output', document.createElement('div'));
		this.logTab.content.classList.add('gm-constructor-tab', 'gm-constructor-viewer', 'popout-window');
		this.logTab.events.on('contentResized', () => this.client?.displayResized());
		this.logTab.events.on('close', () => this.destroy());
	}

	destroy() {
		this.client?.displayClosed();
		this.bottomPane.closeTab(this.logTab);

		if (this.errorsTab !== undefined) {
			this.bottomPane.closeTab(this.errorsTab);
		}
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
		this.logTab.content.prepend(client.getContent());
	}

	/**
	 * @type {UI.OutputLogDisplay['disconnect']}
	 */
	disconnect() {
		if (this.client === undefined) {
			return;
		}

		this.logTab.content.textContent = '';

		if (this.errorsTab !== undefined) {
			this.bottomPane.closeTab(this.errorsTab);
		}

		this.client.displayClosed();
		this.client = undefined;
	}

	/**
	 * @type {UI.OutputLogDisplay['bringToForeground']}
	 */
	bringToForeground() {
		this.bottomPane.show();
		this.bottomPane.showTab(this.logTab);
	}

	/**
	 * @type {UI.OutputLogDisplay['supportsTitle']}
	 */
	supportsTitle() {
		return true;
	}

	/**
	 * @type {UI.OutputLogDisplay['setTitle']}
	 */
	setTitle(title, status) {
		this.bottomPane.renameTab(this.logTab, (status === undefined) ? title : `${title}: ${status}`);

		if (this.errorsTab !== undefined) {
			this.bottomPane.renameTab(this.errorsTab, `${title} - Errors`);
		}

		this.title = title;
	}

	/**
	 * @type {UI.OutputLogDisplay['addError']}
	 */
	addError(error) {
		if (this.errorsTab === undefined) {
			this.errorsTab = this.bottomPane.openTab(`${this.title}: Errors`, document.createElement('div'));
			this.errorsTab.content.classList.add('gm-constructor-tab', 'gm-constructor-viewer-bottom-pane', 'gm-constructor-viewer-errors', 'popout-window');

			this.errorsTab.events.on('close', () => {
				this.errorsTab = undefined;
			});
		}

		this.errorsTab.content.appendChild(error.asHTML());
		this.bottomPane.showTab(this.errorsTab);
	}
}
