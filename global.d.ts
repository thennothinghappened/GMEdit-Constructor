declare type GMConstructorPreferencesData = {
    defaultRuntimeVersion?: string;
    runtimesPath?: string;
    runtimes: string[];
}

declare type GMConstructorCompileSettings = {
}

declare type GMConstructorCompilerJob = {
    command: GMConstructorCompilerCommand;
    process: ChildProcess;
    project: GMLProject;
    stdout: string;
    stderr: string;
}

declare type GMConstructorCompilerCommand = 
    'Run'       |
    'Package'   |
    'Clean'     ;

declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare let gmConstructor: GMConstructor;

declare type GMEdit_Event =
    'preferencesBuilt'          |
    'projectPropertiesBuilt'    |
    'projectOpen'               |
    'projectClose'              ;

declare class GMEdit {
    static register = function(name: string, body: GMPlugin) {}
    static on = function(event: GMEdit_Event, callback: (event: Event) => void) {}
    static off = function(event: GMEdit_Event, callback: (event: Event) => void) {}
}

declare class Electron_App {
    static getPath = function(name: string): string {}
}

declare class Electron_FS {
    static readFileSync = function(path: string): string {}
    static readdirSync = function(path: string): string[] {}
    static writeFileSync = function(path: string, content: string) {}
    static existsSync = function(path: string): boolean {}
}

declare type Electron_MenuItemProps = {
    id: string,
    label?: string,
    type?: 'normal'|'separator',
    toolTip?: string,
    accelerator?: string,
    icon?: string,
    enabled?: boolean,
    visible?: boolean,
    submenu?: Electron_MenuItem[],
    click?: () => void
}

declare type Electron_Menu = {
    append: (item: Electron_MenuItem) => void,
    items: Electron_MenuItem[],
    clear: () => void
}

declare class Electron_MenuItem {
    constructor(props: Electron_MenuItemProps) {}

    id: string;
    enabled: boolean;
    visible?: boolean;
    submenu?: Electron_Menu;
}

declare interface GMEditUIPreferences {
    addText:        (el: HTMLElement, label: string) => HTMLElement;
    addCheckbox:    (el: HTMLElement, label: string, value: boolean, update: (value: boolean) => void) => HTMLElement;
    addInput:       (el: HTMLElement, label: string, value: string, update: (value: string) => void) => HTMLElement;
    addDropdown:    (el: HTMLElement, label: string, value: string, choices: string[], update: (value: string) => void) => HTMLElement;
    addGroup:       (el: HTMLElement, label: string) => HTMLElement;
}

declare interface GMEditUIMainMenu {
    menu: Electron_Menu
}

declare type GMLProject = {
    name: string;
    displayName: string;
    config: string;
    dir: string;
    path: string;
    isGMS23: boolean;
}

declare interface GMEditGMLProject {
    current: GMLProject;
}

/**
 * ...
 * @author YellowAfterlife
 */
class FileKind {

    public checkSelfForChanges: boolean = true;

    constructor() {}

    /**
	 * @returns created file or null
	 */
	public create = (name: string, path: string, data: any, nav: GmlFileNav): GmlFile => {
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
	 * Called by a GmlFile upon creation.
	 * Should assign the file.editor by least.
	 */
	public init = (file: GmlFile, data: any): void => {
		//
	}

    /** We're asked to bring `nav` into view */
	public navigate = (editor: Editor, nav: GmlFileNav): boolean => {
		return false;
	}

    public getTabContext = (file: GmlFile, data: any): string => {
		if (file.path != null) return file.path;
		return file.name;
	}
}

/**
 * ...
 * @author YellowAfterlife
 */
class KCode extends FileKind {
	/// whether to do a GmlSeeker pass after saving to update definitions
	public indexOnSave: boolean = false;
	
	/**
	 * Whether to set GmlFile.changed when code gets changed
	 * @see AceStatusBar.update
	 */
	public setChangedOnEdits: boolean = true;

    constructor() {
        super();
    }

    override public init = (file: GmlFile, data: any) => {
		file.codeEditor = new EditCode(file, modePath);
		file.editor = file.codeEditor;
	}

    

    public loadCode = (editor: EditCode, data: any): string => {
		return data != null ? data : editor.file.readContent();
	}

	public saveCode = (editor: EditCode, code: string): boolean => {
		if (editor.file.path == null) return false;
		return editor.file.writeContent(code);
	}

    
}

/**
 * Represents a single "file", which will usually be tied to a tab and has an editor tied to it.
 * Some editor types (e.g. object editor for GMS2+) may associate multiple files on disk with one tab.
 * @author YellowAfterlife
 */
declare class GmlFile {

    /** Display name (used for tab title). Usually name.ext */
    public name: string;
    /** Full path to the source file (null if no source file, e.g. search results) */
    public path: string?;
    /** Loading/saving mode of operation */
    public kind: FileKind;
    /** Context (used for tagging tabs) */
    public context: string;
    /** The associated editor */
	public editor: Editor;
    /** Shortcut if this is a code editor. Otherwise null */
	public codeEditor:EditCode;

    public static next: GmlFile?;

    constructor(name: string, path: string?, kind: FileKind, data?: any) {
        this.name = name;
		this.path = path;
		this.kind = kind;
		
		context = kind.getTabContext(this, data);
		kind.init(this, data);
		load(data);
		editor.ready();
    }

    public close = (): void => {
		editor.stateSave();
		editor.destroy();
	}

    public getAceSession = (): AceSession? => {
		return codeEditor.session ?? null;
	}

    public static open = (name: string, path: string, nav?: GmlFileNav): GmlFile? => {
		path = Path.normalize(path);
		// todo: perhaps completely eliminate "name" from here and rely on file data
		// see if there's an existing tab for this:
		for (tabEl in ui.ChromeTabs.element.querySelectorEls('.chrome-tab')) {
			const gmlFile: GmlFile = tabEl.gmlFile;
			if (gmlFile !== null && gmlFile.path === path) {
				tabEl.click();
				if (nav != null) Main.window.setTimeout(function() {
					gmlFile.navigate(nav);
				});
				return gmlFile;
			}
		}
        
        let kind: FileKind;
        let data: any?;

		// determine what to do with the file:
		if (nav !== null && nav.kind !== null) {
			kind = nav.kind;
			data = null;
		} else {
			const kd = GmlFileKindTools.detect(path);
			kind = kd.kind;
			data = kd.data;
		}

		if (
            kind instanceof file.kind.misc.KExtern &&
			(!electron.Electron.isAvailable() ||
             nav != null && nav.noExtern        )
		) {
			kind = file.kind.misc.KPlain.inst;
		}

		return kind.create(name, path, data, nav);
	}

    /**
	 * Loads the current code
	 * @param data If provided, is used instead of reading from FS.
	 */
	public load = (data: any?) => {
		this.editor.load(data);
	}

    public static openTab = (file: GmlFile) => {
		file.editor.stateLoad();
		// addTab doesn't return the new tab so we bind it up in the "active tab change" event:
		GmlFile.next = file;
		ui.ChromeTabs.addTab(file.name);
	}

    public rename = (newName: string, newPath: string): void => {
		this.name = newName;
		this.path = newPath;

		this.context = this.kind.getTabContext(this, {});
	}
}

/**
 * ...
 * @author YellowAfterlife
 */
declare class Editor {

    public static container: HTMLElement;
	
	public element: HTMLElement;
	public file: GmlFile;

    constructor(file: GmlFile) {
		this.file = file;
	}

    public load = (data: any?) => {
		
	}

    public stateSave = () => {
		// may save state to LS
	}
	public stateLoad = () => {
		// may load previously saved state
	}
	
	/** new -> load -> ready */
	public ready = () => {
		
	}

    /** [x] clicked -> status checks -> stateSave -> destroy */
	public destroy = () => {
		
	}
}

/**
 * ...
 * @author YellowAfterlife
 */
class EditCode extends Editor {
    
    public static currentNew: EditCode = null;
	public static container: HTMLElement;

	public session: AceSession;
	public kind: KCode;

    private modePath: string;

    constructor(file: GmlFile, modePath: string) {
		super(file);

		this.kind = cast(file.kind, KCode);
		this.modePath = modePath;
		element = container;
	}

    override public stateLoad = () => {
		if (file.path != null) {
            AceSessionData.restore(this);
        }
	}

	override public stateSave = () => {
		AceSessionData.store(this);
	}

}

declare type $GMEdit = {
    'ui.Preferences': GMEditUIPreferences;
    'ui.MainMenu': GMEditUIMainMenu;
    'gml.Project': GMEditGMLProject;
    'editors.Editor': typeof Editor;
    'file.FileKind': typeof FileKind;
    'gml.file.GmlFile': typeof GmlFile;
};

declare const $gmedit: $GMEdit;
