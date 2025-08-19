import { ConstructorTab } from '../tabs/ConstructorTab.js';
import * as ui from '../ui-wrappers.js';
import { GmlFileUtils } from '../../utils/gmedit/GmlFileUtils.js';

const FileKind = $gmedit['file.FileKind'];
const GmlFile = $gmedit['gml.file.GmlFile'];

/**
 * 'Editor' for viewing a compile log all fancy.
 * @implements {UI.OutputLogDisplay}
 */
export class OutputLogTab extends ConstructorTab {
	/**
	 * @private
	 * @type {UI.Group}
	 */
	errorsGroup;

	/**
	 * @private
	 * @type {UI.OutputLogDisplay.Client|undefined}
	 */
	client = undefined;

	/**
	 * GMEdit calls `stateSave` and then `destroy`. If `destroy` is called by us though, its meaning
	 * is that of `Destroyable`, and should close the tab. GMEdit is calling it due to the tab
	 * already being the process of closing, so if `false`, then we shouldn't trigger a file close.
	 * 
	 * @private
	 */
	shouldCloseGMEditFile = true;

	/**
	 * @private
	 * @param {GMEdit.GmlFile} file
	 */
	constructor(file) {
		super(file);

		this.element.classList.add('gm-constructor-viewer', 'popout-window');

		this.errorsGroup = ui.group(this.element, 'Errors')
		this.errorsGroup.classList.add('gm-constructor-viewer-errors');
		this.errorsGroup.legend.addEventListener('click', () => this.client?.displayResized());
		this.errorsGroup.hidden = true;
	}

	stateSave() {
		this.shouldCloseGMEditFile = false;
	}

	destroy() {
		this.disconnect();

		if (this.shouldCloseGMEditFile) {
			this.shouldCloseGMEditFile = false;
			this.close();
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
		this.element.prepend(client.getContent());
		
		this.errorsGroup
			.querySelectorAll(':scope > :not(legend)')
			.forEach(error => error.remove());

		this.errorsGroup.hidden = true;
	}

	/**
	 * @type {UI.OutputLogDisplay['disconnect']}
	 */
	disconnect() {
		if (this.client === undefined) {
			return;
		}

		this.client.displayClosed();

		for (const child of Array.from(this.element.children)) {
			if (child !== this.errorsGroup) {
				child.remove();
			}
		}

		this.client = undefined;
	}

	/**
	 * @type {UI.OutputLogDisplay['bringToForeground']}
	 */
	bringToForeground() {
		this.focus();
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
	setTitle(title) {
		GmlFileUtils.rename(this.file, title);
	}

	/**
	 * @type {UI.OutputLogDisplay['addError']}
	 */
	addError(error) {
		this.errorsGroup.prepend(error.asHTML());
		this.errorsGroup.hidden = false;
	}

	/**
	 * Create and open a new tab.
	 * @returns {OutputLogTab}
	 */
	static create() {
		const file = new GmlFile('Constructor Job', null, this.fileKind);
		GmlFile.openTab(file);

		return /** @type {OutputLogTab} */ (file.editor);
	}
	
	/**
	 * @private
	 */
	static fileKind = new class extends FileKind {
		constructor() {
			super();
			this.checkSelfForChanges = false;
		}

		/**
		 * @param {GMEdit.GmlFile} file
		 */
		init(file) {
			file.editor = new OutputLogTab(file);
		}
	};
}
