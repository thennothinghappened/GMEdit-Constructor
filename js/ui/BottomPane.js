import { InvalidStateErr } from '../utils/Err.js';
import { use } from '../utils/scope-extensions/use.js';

const BOOKMARK_NORMAL_COLOUR = '#444444';
const BOOKMARK_SELECT_COLOUR = '#333333';
const BOOKMARK_HOVER_COLOUR = '#454545';

/**
 * Custom bottom pane for GMEdit. This is effectively a pre-test using a plugin for functionality
 * that I'd like to make part of GMEdit itself later on. As such, there's very little cleanliness
 * here and there are hooks into GMEdit internals and such.
 * 
 * @implements {Destroyable}
 */
export class BottomPane {

	/**
	 * @type {UI.Tab[]}
	 * @private
	 */
	tabs = [];

	/**
	 * @type {UI.Tab|undefined}
	 * @private
	 */
	activeTab = undefined;

	/**
	 * The container that holds both the bottom pane and the editor.
	 * @private
	 */
	container = /** @type {HTMLDivElement} */ (document.querySelector('.bottom.gml > .tabview'));

	/**
	 * The old values of the container's properties when the pane is 
	 * @private
	 */
	containerOldProps = {
		flexDirection: ''
	};

	/**
	 * @private
	 */
	element = use(document.createElement('div')).also(it => {
		it.style = `
			box-sizing: border-box;
			flex-grow: 0;
			flex-shrink: 0;
			flex-basis: 30%;
			min-height: 0.45em;
			max-height: 90%;
		`;
	}).value;

	/**
	 * @private
	 */
	tabListElement = use(document.createElement('div')).also(it => {
		it.style = `
			display: none;
			flex-direction: row;
		`;
	}).value;

	/**
	 * @private
	 * @type {Map<UI.Tab, { container: HTMLDivElement, title: HTMLSpanElement }>}
	 */
	tabBookmarkElements = new Map();

	/**
	 * @private
	 */
	divider = use(document.createElement('div')).also(it => {
		it.classList.add('splitter-td');
		it.style = `
			cursor: n-resize;
			width: 100%;
			height: 0.45em;
		`;
	}).value;

	/**
	 * @private
	 */
	isResizing = false;

	/**
	 * @private
	 */
	lastMouseY = 0;

	/**
	 * Create the pane. The pane is visible when it contains any tabs.
	 */
	constructor() {
		this.divider.addEventListener('mousedown', event => {
			this.isResizing = true;
			this.lastMouseY = event.clientY;
			event.preventDefault();
		});

		document.body.addEventListener('mousemove', this.onMouseMove);
		document.body.addEventListener('mouseup', this.onMouseUp);

		this.element.appendChild(this.divider);
		this.element.appendChild(this.tabListElement);

		GMEdit.on('activeFileChange', this.onActiveFileChange);
	}

	/**
	 * Remove the pane.
	 */
	destroy() {
		GMEdit.off('activeFileChange', this.onActiveFileChange);

		document.body.removeEventListener('mousemove', this.onMouseMove);
		document.body.removeEventListener('mouseup', this.onMouseUp);
		
		this.hide();
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {HTMLElement} content 
	 * @param {() => void} [contentResized] 
	 * @returns {UI.Tab} The tab that was created. This tab can be removed by supplying this tab structure to `remove`.
	 */
	openTab(name, content, contentResized) {
		/** @type {UI.Tab} */
		const tab = { name, content, contentResized };
		this.tabs.push(tab);

		const bookmark = {
			container: document.createElement('div'),
			title: document.createElement('span')
		};

		bookmark.container.style.backgroundColor = BOOKMARK_NORMAL_COLOUR;
		bookmark.container.style.height = '1em';
		bookmark.container.style.padding = '0.3em 0.5em';
		bookmark.container.style.textOverflow = 'ellipsis';
		bookmark.container.style.overflow = 'hidden';
		bookmark.container.style.whiteSpace = 'nowrap';
		bookmark.container.style.boxSizing = 'content-box';
		bookmark.container.style.userSelect = 'none';

		bookmark.container.addEventListener('click', () => {
			this.showTab(tab);
		});

		bookmark.title.textContent = tab.name;
		bookmark.container.appendChild(bookmark.title);

		this.tabBookmarkElements.set(tab, bookmark);
		this.tabListElement.appendChild(bookmark.container);

		if (this.tabs.length >= 2) {
			this.tabListElement.style.display = 'flex';
		} else {
			this.tabListElement.style.display = 'none';
			this.show();
		}
		
		this.showTab(tab);
		return tab;
	}

	/**
	 * @param {UI.Tab} tab The tab returned from `add` to be removed.
	 */
	closeTab(tab) {
		const tabIndex = this.tabs.indexOf(tab);
		this.tabs.splice(tabIndex, 1);

		const bookmark = this.tabBookmarkElements.get(tab);
		this.tabBookmarkElements.delete(tab);
		bookmark?.container.remove();

		tab.content.remove();

		if (tab === this.activeTab) {
			let newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
			this.activeTab = undefined;

			if (this.tabs[newActiveIndex] !== undefined) {
				this.showTab(this.tabs[newActiveIndex]);
			}
		}
		
		if (this.tabs.length < 2) {
			this.tabListElement.style.display = 'none';

			if (this.tabs.length === 0) {
				this.hide();
			}
		}
	}

	/**
	 * 
	 * @param {UI.Tab} tab 
	 * @param {string} name 
	 */
	renameTab(tab, name) {
		tab.name = name;

		const bookmark = this.tabBookmarkElements.get(tab);

		if (bookmark === undefined) {
			throw new InvalidStateErr('Tab has no associated bookmark - is this tab closed?');
		}

		bookmark.title.textContent = name;
	}

	/**
	 * Make the given tab the active tab.
	 * @param {UI.Tab} tab 
	 */
	showTab(tab) {
		if (this.activeTab !== undefined) {
			this.element.removeChild(this.activeTab.content);
			this.tabBookmarkElements.get(this.activeTab).container.style.backgroundColor = BOOKMARK_NORMAL_COLOUR;
		}

		this.element.appendChild(tab.content);
		this.tabBookmarkElements.get(tab).container.style.backgroundColor = BOOKMARK_SELECT_COLOUR;
		this.activeTab = tab;

		if (this.activeTab?.contentResized !== undefined) {
			this.activeTab.contentResized();
		}
	}

	show() {
		this.container.appendChild(this.element);

		this.containerOldProps.flexDirection = this.container.style.flexDirection;
		this.container.style.flexDirection = 'column';

		if (this.activeTab?.contentResized !== undefined) {
			this.activeTab.contentResized();
		}
	}

	hide() {
		this.element.remove();
		this.container.style.flexDirection = this.containerOldProps.flexDirection;
	}

	/**
	 * @private
	 * @param {GMEdit.PluginEventMap['activeFileChange']} event
	 */
	onActiveFileChange = (event) => {
		// Ensure the pane is actually at the bottom - GMEdit doesn't expect a second element in
		// here so new tab contents just get appended, which would put us above them.
		if (this.tabs.length > 0) {
			this.hide();
			this.show();
		}
	}

	/**
	 * @param {MouseEvent} event
	 */
	onMouseMove = (event) => {
		if (!this.isResizing) {
			return;
		}

		const delta = event.clientY - this.lastMouseY;

		if (delta !== 0) {
			this.element.style.flexBasis = `${this.element.clientHeight - delta}px`;
		}

		this.lastMouseY = event.clientY;
		event.preventDefault();
	}

	/**
	 * @param {MouseEvent} event
	 */
	onMouseUp = (event) => {
		if (this.isResizing) {
			this.isResizing = false;

			if (this.activeTab?.contentResized !== undefined) {
				this.activeTab.contentResized();
			}

			event.preventDefault();
		}
	}
}
