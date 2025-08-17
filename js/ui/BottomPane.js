import { InvalidStateErr } from '../utils/Err.js';
import { EventEmitterImpl } from '../utils/EventEmitterImpl.js';
import { use } from '../utils/scope-extensions/use.js';

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
	 * @private
	 */
	element = use(document.createElement('div'))
		.also(it => { it.id = 'bottom-panel' })
		.value;

	/**
	 * @private
	 */
	headerElement = document.createElement('nav');

	/**
	 * @private
	 */
	tabListElement = use(document.createElement('div'))
		.also(it => { it.className = 'tab-list' })
		.value;

	/**
	 * @private
	 */
	closeButton = use(document.createElement('div'))
		.also(it => { it.className = 'close-button' })
		.also(it => it.addEventListener('click', () => {
			// Close all tabs!
			while (this.activeTab !== undefined) {
				this.closeTab(this.activeTab);
			}
		}))
		.value;

	/**
	 * @private
	 * @type {Map<UI.Tab, { container: HTMLDivElement, title: HTMLSpanElement }>}
	 */
	tabBookmarkElements = new Map();

	/**
	 * @private
	 */
	divider = use(document.createElement('div'))
		.also(it => { it.className = 'splitter-td' })
		.value;

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

		this.headerElement.appendChild(this.tabListElement);
		this.headerElement.appendChild(this.closeButton);

		this.element.appendChild(this.divider);
		this.element.appendChild(this.headerElement);

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
	 * @returns {UI.Tab} The tab that was created. This tab can be removed by supplying this tab structure to `remove`.
	 */
	openTab(name, content) {
		/** @type {UI.Tab} */
		const tab = {
			name,
			content,
			events: new EventEmitterImpl(['contentResized', 'close'])
		};

		this.tabs.push(tab);

		const bookmark = {
			container: document.createElement('div'),
			title: document.createElement('span'),
			closeButton: document.createElement('div')
		};

		bookmark.container.className = 'tab';
		bookmark.container.addEventListener('click', event => {
			if (event.target !== bookmark.closeButton) {
				event.preventDefault();
				this.showTab(tab);
			}
		});

		bookmark.container.addEventListener('auxclick', event => {
			// Middle-click to close.
			if (event.button === 1) {
				event.preventDefault();
				this.closeTab(tab);
			}
		});

		bookmark.title.textContent = tab.name;
		bookmark.title.className = 'title';
		bookmark.container.appendChild(bookmark.title);

		bookmark.closeButton.className = 'close-button';
		bookmark.closeButton.addEventListener('click', event => {
			event.preventDefault();
			this.closeTab(tab);
		});

		bookmark.container.appendChild(bookmark.closeButton);

		this.tabBookmarkElements.set(tab, bookmark);
		this.tabListElement.appendChild(bookmark.container);

		if (this.tabs.length === 1) {
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

		if (tabIndex < 0) {
			return;
		}

		this.tabs.splice(tabIndex, 1);

		if (this.tabs.length === 0) {
			this.hide();
		}

		const bookmark = this.tabBookmarkElements.get(tab);
		this.tabBookmarkElements.delete(tab);

		bookmark?.container.remove();

		if (tab === this.activeTab) {
			this.activeTab = undefined;
			tab.content.remove();

			const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);

			if (newActiveIndex >= 0) {
				this.showTab(this.tabs[newActiveIndex]);
			}
		}

		tab.events.emit('close', undefined);
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
			if (tab === this.activeTab) {
				return;
			}

			this.element.removeChild(this.activeTab.content);
			this.tabBookmarkElements.get(this.activeTab).container.classList.remove('active');
		}

		this.element.appendChild(tab.content);
		this.tabBookmarkElements.get(tab).container.classList.add('active');

		this.activeTab = tab;
		this.activeTab.events.emit('contentResized', undefined);
	}

	show() {
		this.container.appendChild(this.element);
		this.activeTab?.events.emit('contentResized', undefined);
	}

	hide() {
		this.element.remove();
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
			event.preventDefault();

			this.isResizing = false;
			this.activeTab?.events.emit('contentResized', undefined);
		}
	}
}
