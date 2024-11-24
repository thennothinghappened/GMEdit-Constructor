
export declare global {

	module GMEdit {

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
			tabsReorder: { target: ChromeTabsImpl };
			
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
			fileSave: { file: GmlFile, code: String? };
			
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

		/**
		 * Exposes a globally visible GMEdit object that you can use for some random bits
		 */
		interface PluginAPI {
		
			aceTools: AceTools;
		
			register(pluginName: string, data: PluginData);
			on<K extends keyof PluginEventMap>(type: K, listener: (e: PluginEventMap[K]) => any);
			off<K extends keyof PluginEventMap>(type: K, listener: (e: PluginEventMap[K]) => any);
		
		}

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

		interface Preferences {
			addText:		(parent: HTMLElement, label: string) => HTMLElement;
			addWiki:		(parent: HTMLElement, url: string, label: string) => HTMLElement;
			addCheckbox:	(parent: HTMLElement, label: string, value: boolean, update: (value: boolean) => void) => HTMLElement;
			addInput:		(parent: HTMLElement, label: string, value: string, update: (value: string) => void) => HTMLElement;
			addDropdown:	(parent: HTMLElement, label: string, value: string, choices: string[], update: (value: string) => void) => HTMLDivElement;
			addGroup:		(parent: HTMLElement, label: string) => HTMLFieldSetElement;
			addButton:		(parent: HTMLElement, text: string, callback: () => void) => HTMLDivElement;
			addBigButton:	(parent: HTMLElement, text: string, callback: () => void) => HTMLDivElement;
		}
	
		interface ProjectProperties {
			load(project: Project): ProjectData;
			save(project: Project, data: ProjectData);
			open();
	
		}

		type ProjectData = Partial<{
			
			/** API override */
			gmlVersion: string;

			'GMEdit-Constructor': Partial<Preferences.ProjectData>;

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
			isGMS23: boolean;
	
			/**
			 * Synchronously read a YY file to JSON.
			 * 
			 * @param path The path of the YY file to read.
			 * @returns YY file as JSON.
			 */
			readYyFileSync: (path: string) => ProjectYY;
	
		}

		class FileKind {

			checkSelfForChanges: boolean = true;

			constructor() {}

			/**
			 * @returns created file or null
			 */
			create = (name: string, path: string, data: any, nav: GmlFileNav): GmlFile => {
				const file = new GmlFile(name, path, this, data);
				GmlFile.openTab(file);

				if (file.codeEditor !== null) {
					Main.window.setTimeout(() => {
						Main.aceEditor.focus();
						if (nav !== null) {
							file.navigate(nav);
						}
					});
				}

				return file;
			}

			/**
			 * Called by a GmlFile upon creation, initialising said file of this type.
			 * Should assign the file.editor by least.
			 */
			init = (file: GmlFile, data: any): void => {}

			/** We're asked to bring `nav` into view */
			navigate = (editor: Editor, nav: GmlFileNav): boolean => {}

			getTabContext = (file: GmlFile, data: any): string => {
				if (file.path != null) return file.path;
				return file.name;
			}
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
			tabEl: ChromeTab;

			/**
			 * The current file in focus.
			 */
			static current: GmlFile?;

			constructor(name: string, path: string?, kind: FileKind, data?: any);

			static openTab(file: GmlFile);
			static open(name: string, path: string, nav?: GmlFileNav): GmlFile?;
			
			save();
			
			/**
			 * Loads the current code
			 * @param data If provided, is used instead of reading from FS.
			 */
			load(data: any?);
			
			rename(newName: string, newPath: string);
			
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
			load(data: any?);

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
			
			constructor() {
				super();
			}
			
			override init = (file: GmlFile, data?: any): void => {}
			
			loadCode = (editor: EditCode, data?: any): string => {}

			saveCode = (editor: EditCode, code: string): boolean => {}

		}

		class EditCode extends Editor {
			
			static currentNew: EditCode? = null;
			static container: Element;

			session: AceSession;
			kind: KCode;
			private modePath: string;
			
			constructor(file: GmlFile, modePath: string) {
				super(file);
				this.kind = file.kind;
				this.modePath = modePath;
				this.element = container;
			}
			
			override stateLoad = () => {}

			override stateSave = () => {}
			
			override focusGain = (prev: Editor): void => {}

			override save = (): boolean => {}

			override checkChanges = (): void => {}
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

		interface GMEditKeyboardShortcuts {
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

	};
	
	const $gmedit: {
		'ui.Preferences': GMEdit.Preferences;
		'ui.MainMenu': GMEdit.MainMenu;
		'ui.project.ProjectProperties': ProjectProperties;
		'ui.ChromeTabs': GMEdit.ChromeTabs;
		'ui.KeyboardShortcuts': GMEditKeyboardShortcuts;
		'gml.Project': typeof GMEdit.Project;
		'editors.Editor': typeof GMEdit.Editor;
		'file.FileKind': typeof GMEdit.FileKind;
		'file.kind.KCode': typeof GMEdit.KCode;
		'gml.file.GmlFile': typeof GMEdit.GmlFile;
		'editors.EditCode': typeof GMEdit.EditCode;
		'ace.AceCommands': AceCommands;
	};

	interface Window {
		readonly GMEdit: GMEdit.PluginAPI;
	};
	
};
