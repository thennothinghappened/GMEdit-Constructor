
export declare global {

	namespace GMEdit {

		/**
		 * Haxe doesn't differentiate `undefined` and `null` - to it there is only `null`, which is
		 * nice, but over here in JavaScript, we have to handle the fact that this means we cannot
		 * be sure if a value coming from Haxe is one or the other, if it is nullable.
		 */
		type HaxeNull<T> = T | undefined | null;

		class PluginState {

			name: string;
			config: PluginConfig;
			dir: string;
			ready: boolean;
			error: Error?;
			listeners: PluginCallback[];
			data: PluginData;
			
			/** Scripts and styles */
			elements: HTMLElement[];
			
			constructor(name: string, dir: string);

			destroy();
			finish(error: Error?);

		}

		type PluginCallback = (error: Error?) => Void;

		interface PluginData {

			/**
			 * Called after all of plugin's files are loaded up.
			 */
			init(state: PluginState);
			
			/**
			 * Called before unloading the plugin (currently you cannot)
			 */
			cleanup();
			
		}

		interface PluginEventMap {

			/**
			 * Dispatches whenever the user drags tabs around to change their order.
			 */
			tabsReorder: { target: ChromeTabs };
			
			/**
			 * Dispatches prior to showing the tab context menu.
			 */
			tabMenu: { target: ChromeTab, event: MouseEvent };
			
			/**
			 * Dispatches when a new file is opened and ready to go.
			 */
			fileOpen: { file: GmlFile };

			/**
			 * Dispatches when a new project is opened and ready to go.
			 */
			projectOpen: { project: Project };

			/**
			 * Dispatches when the project is closed or a new project is opened
			 */
			projectClose: { project: Project };
			
			/**
			 * Dispatches when saving the project state (treeview, open tabs).
			 * You can save your plugin-specific per-project state here.
			 */
			projectStateSave: { project: Project, state: ProjectState };
			
			/**
			 * Dispatches when restoring the project state.
			 * This happens when the project is fully loaded and tabs were re-opened.
			 * You can load your previously-saved plugin-specific per-project state here.
			 */
			projectStateRestore: { project: Project, state: ProjectState };
			
			/**
			 * Dispatches when active file (read: tab) changes
			 */
			activeFileChange: { file: GmlFile };
			
			/**
			 * Dispatches after a file (and it's tab) is closed and before it's gone for good.
			 * Tab indicates it's tab element (which is no longer in DOM at this point).
			 */
			fileClose: { file: GmlFile, tab: ChromeTab };
			
			/**
			 * Dispatches after a file is saved.
			 * `code` will contain a copy of file's new contents, if appropriate
			 */
			fileSave: { file: GmlFile, code: string? };
			
			/**
			 * Dispatches after a file tab was reloaded due to changes on disk
			 * (automatically or with user permit)
			 */
			fileReload: { file: GmlFile };
			
			/**
			 * Called after constructing the preferences menu.
			 * You can use this to insert your plugin-specific DOM elements into it.
			 * ui.Preferences offers a large set of helpers for all kinds of helpers.
			 */
			preferencesBuilt: { target: HTMLElement };
			
			/**
			 * Called after constructing the preferences menu.
			 * You can use this to insert your plugin-specific DOM elements into it.
			 * ui.Preferences is similarly used here.
			 */
			projectPropertiesBuilt: { project: Project, target: HTMLElement };
			
			/**
			 * Called whenever instantiating a new Ace editor.
			 * You can use this to apply editor hooks/modifications.
			 */
			editorCreated: { editor: AceAjax.Editor, options: AceWrapOptions };
			
		};

		interface AceTools {
			createEditor(element: string|HTMLElement, options?: AceWrapOptions): AceAjax.Editor;
		};

		type AceWrapOptions = Partial<{
			isPrimary: boolean,
			statusBar: boolean,
			completers: boolean,
			linter: boolean,
			contextMenu: boolean,
			commands: boolean,
			inputHelpers: boolean,
			tooltips: boolean,
			preferences: boolean,
			scrollMode: boolean,
			dispatchEvent: boolean,
		}>;

		interface TreeView {
			
			element: HTMLDivElement;
			openPaths: string[];

			clear();
			find(item: boolean, query: TreeViewQuery): HTMLElement;
			
			hasThumb(itemPath: string): boolean;
			addThumbRule(itemPath: string, thumbPath: string);
			setThumb(itemPath: string, thumbPath: string, item: HTMLElement?);
			setThumbSprite(itemPath: string, spriteName: string, item: HTMLElement?);
			resetThumb(itemPath: string, item: HTMLElement?);
			
			handleDirClick(e: MouseEvent);
			handleDirCtxMenu(e: MouseEvent);
			handleItemCtxMenu(e: MouseEvent);
			
			makeDir(name: string): TreeViewDir;
			makeAssetDir(name: string, rel: string, filter: string?): TreeViewDir;
			
			makeItem(name: string): TreeViewItem;
			handleItemClick(e: MouseEvent, element: HTMLElement?, nav: GmlFileNav?): GmlFile;
			
			makeAssetItem(name: string, rel: string, path: string, kind: string): TreeViewItem;
			
			insertSorted(dir: TreeViewDir, item: HTMLElement);
			
			openProject(el: HTMLElement);
			makeProject(name: string, path: string);
			
			showElement(item: HTMLElement, flash: boolean);
			
			saveOpen();
			restoreOpen(paths: string[]?);
		}

		class TreeViewDir extends TreeViewElement {
			treeHeader: HTMLDivElement;
			treeItems: HTMLDivElement;

			treeIsOpen: boolean;
			
			readonly treeItemEls: NodeList<TreeViewElement>;
			
			/** like "folders/Scripts/Tools.yy" for "Scripts/Tools" - used in .yyp/.resource_order */
			readonly treeFolderPath23: string;
		}

		class TreeViewItem extends TreeViewElement {
			/** If not null, overrides the FileKind that will be used for this element. */
			yyOpenAs: FileKind;
			
			/** like "Scripts/Tools/trace.yy" for "Scripts/Tools/trace" - used in .yyp/.resource_order */
			readonly treeResourcePath23: string;
		}
		
		class TreeViewElement extends HTMLDivElement {

			/** 2.3 sort order */
			yyOrder: number;
			
			/** Indicates whether this is a root element - no parent folders */
			readonly treeIsRoot: boolean;
			
			readonly treeIsDir: boolean;
			
			readonly treeIsItem: boolean;
			
			treeRelPath: string;
			
			treeFullPath: string;
			
			treeLabel: string;
			
			treeKind: string;
			
			treeIdent: string;
			
			readonly treeParentDir: TreeViewDir;
			
			/** As seen on the page */
			treeText: string;
			
			/** Gets you the path used in .yyp/.resource_order */
			readonly treeYyPath23: string;
		
		}

		type UIDropdown<T extends string> = HTMLDivElement & { __phantomTypeData?: T };

		class Preferences {

			static menuMain: HaxeNull<HTMLElement>;

			static addText(parent: ParentNode, label: string): HTMLElement;
			static addWiki(parent: ParentNode, url: string, label: string): HTMLElement;
			static addCheckbox(parent: ParentNode, label: string, value: boolean, update: (value: boolean) => void): HTMLElement;
			static addInput(parent: ParentNode, label: string, value: string, update: (value: string) => void): HTMLElement;
			static addDropdown<T extends string>(parent: ParentNode, label: string, value: T, choices: readonly T[], update: (value: T) => void): UIDropdown<T>;
			static addGroup(parent: ParentNode, label: string): HTMLFieldSetElement;
			static addButton(parent: ParentNode, text: string, callback: () => void): HTMLDivElement;
			static addBigButton(parent: ParentNode, text: string, callback: () => void): HTMLDivElement;

		}
	
		interface ProjectProperties {
			load(project: Project): ProjectData;
			save(project: Project, data: ProjectData);
			open();

		}

		type ProjectData = Partial<{
			
			/** API override */
			gmlVersion: string;

			'GMEdit-Constructor'?: Partial<TPreferences.ProjectData>;

		}>;
	
		interface MainMenu {
			menu: Electron.Menu
		}
	
		class Project {

			static current: Project?;
	
			name: string;
			displayName: string;
			config: string;
			dir: string;
			path: string;
			properties: ProjectData;
			propertiesElement: HaxeNull<HTMLDivElement>;

			isGMS23: boolean;
			isGM2022: boolean;
			isGM2023: boolean;
			isGM2024: boolean;
			isGM2024_8: boolean;
	
			/**
			 * Synchronously read a YY file to JSON.
			 * 
			 * @param path The path of the YY file to read.
			 * @returns YY file as JSON.
			 */
			readYyFileSync: (path: string) => GM.YY.File;
	
		}

		class FileKind {

			checkSelfForChanges: boolean = true;

			constructor();

			/**
			 * @returns created file or null
			 */
			create(name: string, path: string, data: unknown, nav: GmlFileNav): GmlFile;

			/**
			 * Called by a GmlFile upon creation, initialising said file of this type.
			 * Should assign the file.editor by least.
			 */
			abstract init(file: GmlFile, data: unknown);

			/** We're asked to bring `nav` into view */
			navigate(editor: Editor, nav: GmlFileNav): boolean;

			getTabContext(file: GmlFile, data: unknown): string;
		}

		/**
		 * Represents a single 'file', which will usually be tied to a tab and has an editor tied to it.
		 * Some editor types (e.g. object editor for GMS2+) may associate multiple files on disk with one tab.
		 */
		class GmlFile {

			/** Display name (used for tab title). Usually name.ext */
			name: string;
			/** Full path to the source file (null if no source file, e.g. search results) */
			path: string?;
			/** Loading/saving mode of operation */
			kind: FileKind;
			/** Context (used for tagging tabs) */
			context: string;
			/** The associated editor */
			editor: Editor;
			/** Whether the file has been modified. */
			__changed: boolean;
			/** The tab associated with this file. */
			tabEl: ChromeTab?;

			/**
			 * The current file in focus.
			 */
			static current: GmlFile?;

			constructor(name: string, path: string?, kind: FileKind, data?: unknown);

			static openTab(file: GmlFile);
			static open(name: string, path: string, nav: GmlFileNav?): GmlFile?;
			
			save();
			
			/**
			 * Loads the current code
			 * @param data If provided, is used instead of reading from FS.
			 */
			load(data?: unknown);
			
			rename(newName: string, newPath: string?);
			
			close();
		}

		class Editor {
			
			element: HTMLElement;
			file: GmlFile;

			constructor(file: GmlFile);

			/**
			 * Load the given `data` into the editor.
			 * @param data The provided data that was loaded for this file.
			 */
			load(data: unknown?);

			/**
			 * Called to finalise editor setup after loading.
			 */
			ready();

			/**
			 * may save state to LS.
			 */
			stateSave();

			/**
			 * may load previously saved state.
			 */
			stateLoad();

			/**
			 * Called when this editor comes into focus.
			 * @param prev The editor that was previously in focus.
			 */
			focusGain(prev: Editor);

			/**
			 * Called when this editor loses focus.
			 * @param next The editor that is now in focus.
			 */
			focusLost(next: Editor);

			/** [x] clicked -> status checks -> stateSave -> destroy */
			destroy();

		}

		class KCode extends FileKind {
			
			/** language mode path for Ace */
			modePath: string = 'ace/mode/text';
			
			/** whether to do a GmlSeeker pass after saving to update definitions */
			indexOnSave: boolean = false;
			
			/**
			 * Whether to set GmlFile.changed when code gets changed
			 * @see AceStatusBar.update
			 */
			setChangedOnEdits: boolean = true;
			
			constructor();
						
			loadCode(editor: EditCode, data?: unknown): string;
			saveCode(editor: EditCode, code: string): boolean;

		}

		class EditCode extends Editor {
			
			static currentNew: EditCode? = null;
			static container: HTMLElement;

			session: AceAjax.IEditSession;
			kind: KCode;
			private modePath: string;
			
			constructor(file: GmlFile, modePath: string);
			
		}

		type AceCommand = {
			name: string;
			title?: string;
			bindKey: { win: string, mac: string };
			exec: () => void;
		};

		interface AceCommands {

			add: (command: AceCommand) => void;
			addToPalette: (command: AceCommand) => void;

			remove: (comamnd: AceCommand) => void;
			removeFromPalette: (comamnd: AceCommand) => void;
		}

		interface AceHashHandler {
			addCommand: (command: AceCommand) => void;
			removeCommand: (command: AceCommand, keepCommand: boolean) => void;
		}

		interface KeyboardShortcuts {
			/**
			 * Handler for global keyboard shortcuts.
			 */
			hashHandler: AceHashHandler;
		}

		interface ChromeTabs {
			getTabs: () => NodeListOf<ChromeTab>;
		}

		interface ChromeTab extends HTMLDivElement {
			gmlFile: GmlFile;
		}

		const aceTools: AceTools;
	
		const register: (pluginName: string, data: PluginData) => void;
		const on: <K extends keyof PluginEventMap>(type: K, listener: (e: PluginEventMap[K]) => void) => void;
		const off: <K extends keyof PluginEventMap>(type: K, listener: (e: PluginEventMap[K]) => void) => void;

	};
	
	const $gmedit: {
		'ui.Preferences': typeof GMEdit.Preferences;
		'ui.MainMenu': GMEdit.MainMenu;
		'ui.project.ProjectProperties': GMEdit.ProjectProperties;
		'ui.ChromeTabs': GMEdit.ChromeTabs;
		'ui.KeyboardShortcuts': GMEdit.KeyboardShortcuts;
		'ui.treeview.TreeView': GMEdit.TreeView;
		'gml.Project': typeof GMEdit.Project;
		'editors.Editor': typeof GMEdit.Editor;
		'file.FileKind': typeof GMEdit.FileKind;
		'file.kind.KCode': typeof GMEdit.KCode;
		'gml.file.GmlFile': typeof GMEdit.GmlFile;
		'editors.EditCode': typeof GMEdit.EditCode;
		'ace.AceCommands': GMEdit.AceCommands;
	};
	
};
