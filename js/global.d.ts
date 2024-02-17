declare type PreferencesData = {

    /** Globally selected runtime options that may be overriden by projects. */
    runtime_opts: {
        type: RuntimeType;

        type_opts: {
            [key in RuntimeType]: RuntimePreference;
        };
    };

    /** Whether to automatically save open files when a task runs. */
    save_on_run_task: boolean;

    /** Whether to reuse the compile viewer tab between runs. */
    reuse_compiler_tab: boolean;
}

/**
 * Project-specific preferences data!
 */
declare type ProjectPreferencesData = {

    /** 
     * Name of the active config to compile with.
     */
    config_name: string;

};

declare type RuntimeType = 
    'Stable'    |
    'Beta'      |
    'LTS'       ;

declare type RuntimePreference = {
    /** Where we should search for the list of runtimes. */
    search_path: string;
    /** Chosen runtime to use. */
    choice: string?;
};

declare interface IRuntimeVersion {

    year: number;
    month: number;
    major: number;
    build: number;

    /**
     * Returns a negative number if this runtime is older than `other`, 0 for same, or postive for newer.
     */
    compare(other: IRuntimeVersion): number;

}

/**
 * Information for a specific found runtime.
 */
declare type RuntimeInfo = {
    version: IRuntimeVersion;
    path: string;
    igor_path: string;
};

declare type Result<T> = 
    { ok: true, data: T }       |
    { ok: false, err: Err }     ;

declare type IgorSettings = {

    platform: IgorPlatform;
    verb: IgorVerb;
    runtime: 'VM'|'YYC';
    threads: number;
    configName: string;

    /**
     * Launch the executable on the target device after building;
     * same as the "Create Executable and Launch" option in the IDE
     */
    launch: boolean;

}

declare type IgorPlatform =
    'OperaGX'           |
    'Windows'           |
    'Mac'               |
    'Linux'             |
    'HTML5'             |
    'ios'               |
    'Android'           |
    'tvos'              |
    'ps4'               |
    'ps5'               |
    'XBoxOne'           |
    'XBoxOneSeriesXS'   |
    'Switch'            ;

declare type IgorVerb = 
    'Run'       |
    'Package'   |
    'Clean'     ;

declare type JobEvent =
    'stdout'    |
    'output'    |
    'stop'      ;

declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare let gmConstructor: GMConstructor;

declare type GMEditEvent =
    'preferencesBuilt'          |
    'projectPropertiesBuilt'    |
    'projectOpen'               |
    'projectClose'              ;

declare class GMEdit {
    static register = function(name: string, body: GMPlugin) {}
    static on = function(event: GMEditEvent, callback: (event: Event) => void) {}
    static off = function(event: GMEditEvent, callback: (event: Event) => void) {}
}

declare interface IElectronApp {
    getPath:        (name: string) => string;
}

declare interface IElectronFS {
    readFile:       (path: string, cb: (err: Error|undefined, data: string|undefined) => void) => void;
    readdir:        (path: string, cb: (err: Error|undefined, files: string[]|undefined) => void) => void;
    writeFile:      (path: string, content: string, cb: (err: Error|undefined) => void) => void;
    existsSync:     (path: string) => boolean;
    exists:         (path: string, cb: (exists: boolean) => void) => void;
}

declare interface IElectronDialog {
    showMessageBox: (options: DialogMessageOptions) => number;
}

declare type DialogMessageType =
	'none'      |
	/** On Windows, "question" displays the same icon as "info" */
	'info'      |
	/** On macOS, both "warning" and "error" display the same warning icon. */
	'error'     |
	/** On Windows, "question" displays the same icon as "info" */
	'question'  |
	/** On macOS, both "warning" and "error" display the same warning icon. */
	'warning'   ;


declare type DialogMessageOptions = {
	/**
	 * On Windows, "question" displays the same icon as "info", unless you set an icon using the "icon" option.
	 * On macOS, both "warning" and "error" display the same warning icon.
	 */
	type?: DialogMessageType,
	
	/**
	 * Array of texts for buttons.
	 * On Windows, an empty array will result in one button labeled "OK".
	 */
	buttons: string[],
	
	/** Content of the message box. */
	message: string,
	
	/** Title of the message box, some platforms will not show it. */
	title?: string,
	
	/** Extra information of the message. */
	detail?: string,
	
	/**  If provided, the message box will include a checkbox with the given label. */
	checkboxLabel?: string,
	
	/** Initial checked state of the checkbox. false by default. */
	checkboxChecked?: boolean,
	
	/**
	 * The index of the button to be used to cancel the dialog, via the Esc key.
	 * By default this is assigned to the first button with "cancel" or "no" as the label.
	 * If no such labeled buttons exist and this option is not set, 0 will be used as the return value.
	 */
	cancelId?: number,
	
	/** Index of the button in the buttons array which will be selected by default when the message box opens. */
	defaultId?: number,
	
	/**
	 * On Windows Electron will try to figure out which one of the buttons are common buttons (like "Cancel" or "Yes"), and show the others as command links in the dialog.
	 * This can make the dialog appear in the style of modern Windows apps.
	 * If you don't like this behavior, you can set noLink to true
	 */
	noLink?: boolean,
};

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
    addText:        (parent: HTMLElement, label: string) => HTMLElement;
    addWiki:        (parent: HTMLElement, url: string, label: string) => HTMLElement;
    addCheckbox:    (parent: HTMLElement, label: string, value: boolean, update: (value: boolean) => void) => HTMLElement;
    addInput:       (parent: HTMLElement, label: string, value: string, update: (value: string) => void) => HTMLElement;
    addDropdown:    (parent: HTMLElement, label: string, value: string, choices: string[], update: (value: string) => void) => HTMLElement;
    addGroup:       (parent: HTMLElement, label: string) => HTMLElement;
    addButton:      (parent: HTMLElement, text: string, callback: () => void) => HTMLDivElement;
    addBigButton:   (parent: HTMLElement, text: string, callback: () => void) => HTMLDivElement;
}

declare interface GMEditProjectProperties {

    load(project: GMLProject): GMLProjectPropertiesData;
    save(project: GMLProject, data: GMLProjectPropertiesData);
    open();

}

declare type GMLProjectPropertiesData = {
	
	/** API override */
	gmlVersion?: string;

    'GMEdit-Constructor'?: Partial<ProjectPreferencesData>;
	
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
    properties: GMLProjectPropertiesData;
    isGMS23: boolean;
}

declare type GMLProjectYY = {
    configs: GMLProjectYYConfig;
}

declare type GMLProjectYYConfig = {
    children: GMLProjectYYConfig[];
    name: string;
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
     * Called by a GmlFile upon creation, initialising said file of this type.
     * Should assign the file.editor by least.
     */
    public init = (file: GmlFile, data: any): void => {}

    /** We're asked to bring `nav` into view */
    public navigate = (editor: Editor, nav: GmlFileNav): boolean => {}

    public getTabContext = (file: GmlFile, data: any): string => {
        if (file.path != null) return file.path;
        return file.name;
    }
}

/**
 * Represents a single 'file', which will usually be tied to a tab and has an editor tied to it.
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
    public codeEditor: EditCode;
    /** Whether the file has been modified. */
    public __changed: boolean;
    /** The tab associated with this file. */
    public tabEl: ChromeTab;

    public static next: GmlFile?;
    public static current: GmlFile?;

    constructor(name: string, path: string?, kind: FileKind, data?: any) {
        this.name = name;
        this.path = path;
        this.kind = kind;
        this.context = kind.getTabContext(this, data);

        kind.init(this, data);

        this.load(data);
        this.editor.ready();
    }

    public close = (): void => {}

    public getAceSession = (): AceSession? => {}

    public static open = (name: string, path: string, nav?: GmlFileNav): GmlFile? => {}

    /**
     * Loads the current code
     * @param data If provided, is used instead of reading from FS.
     */
    public load = (data: any?) => {}

    public static openTab = (file: GmlFile) => {}

    public rename = (newName: string, newPath: string): void => {}

    public save(): void {}
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
class KCode extends FileKind {
    
    /** language mode path for Ace */
    public modePath: string = 'ace/mode/text';
    
    /** whether to do a GmlSeeker pass after saving to update definitions */
    public indexOnSave: boolean = false;
    
    /**
     * Whether to set GmlFile.changed when code gets changed
     * @see AceStatusBar.update
     */
    public setChangedOnEdits: boolean = true;
    
    constructor() {
        super();
    }
    
    override public init = (file: GmlFile, data?: any): void => {}
    
    public loadCode = (editor: EditCode, data?: any): string => {}

    public saveCode = (editor: EditCode, code: string): boolean => {}

}

/**
 * ...
 * @author YellowAfterlife
 */
class EditCode extends Editor {
    
    public static currentNew: EditCode? = null;
    public static container: Element;

    public session: AceSession;
    public kind: KCode;
    private modePath: string;
    
    constructor(file: GmlFile, modePath: string) {
        super(file);
        this.kind = file.kind;
        this.modePath = modePath;
        this.element = container;
    }
    
    override public ready = (): void => {}
    
    override public stateLoad = () => {}

    override public stateSave = () => {}
    
    override public focusGain = (prev: Editor): void => {}

    override public load = (data: any): void => {}

    override public save = (): boolean => {}

    override public checkChanges = (): void => {}
}

declare interface Ace {
    
    define: (
        module: string,
        deps: string[],
        payload: (require: (string) => any, exports: any, module: void) => void
    ) => void
}

declare type AceCommand = {
    name: string;
    title?: string;
    bindKey: { win: string, mac: string };
    exec: () => void;
};

declare interface AceCommands {

    add: (comamnd: AceCommand) => void;
    addToPalette: (command: AceCommand) => void;

    remove: (comamnd: AceCommand) => void;
    removeFromPalette: (comamnd: AceCommand) => void;
}

declare interface ChromeTabs {
    getTabs: () => NodeListOf<ChromeTab>;
}

declare interface ChromeTab extends HTMLDivElement {
    gmlFile: GmlFile;
}

declare type $GMEdit = {
    'ui.Preferences': GMEditUIPreferences;
    'ui.MainMenu': GMEditUIMainMenu;
    'ui.project.ProjectProperties': GMEditProjectProperties;
    'ui.ChromeTabs': ChromeTabs;
    'gml.Project': GMEditGMLProject;
    'editors.Editor': typeof Editor;
    'file.FileKind': typeof FileKind;
    'file.kind.KCode': typeof KCode;
    'gml.file.GmlFile': typeof GmlFile;
    'editors.EditCode': typeof EditCode;
    'ace.AceCommands': AceCommands;
};

declare const $gmedit: $GMEdit;
declare const ace: Ace;

declare const Electron_App: IElectronApp;
declare const Electron_FS: IElectronFS;
declare const Electron_Dialog: IElectronDialog;