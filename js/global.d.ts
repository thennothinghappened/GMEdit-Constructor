
declare type PreferencesData = {

    /** Globally selected runtime options that may be overriden by projects. */
    runtime_opts: {
        type: GMChannelType;
        runner: RunnerType;

        type_opts: {
            [key in GMChannelType]: RuntimePreference;
        };
    };

    /** Whether to automatically save open files when a task runs. */
    save_on_run_task: boolean;

    /** Whether to reuse the compile viewer tab between runs. */
    reuse_compiler_tab: boolean;

    /** Whether we should check for updates on startup. */
    check_for_updates: boolean;

    /** Whether to use the global build directory. */
    use_global_build: boolean;

    /** Global build directory path. */
    global_build_path: string;
    
}

/**
 * Project-specific preferences data!
 */
declare type ProjectPreferencesData = {

    /** 
     * Name of the active config to compile with.
     */
    config_name: string;

    /**
     * Chosen runtime type to use.
     */
    runtime_type: GMChannelType;

    /**
     * Chosen runtime version to use.
     */
    runtime_version: string;

    /**
     * Chosen runner type to use.
     */
    runner: RunnerType;

};

declare type GMChannelType = 
    'Stable'    |
    'Beta'      |
    'LTS'       ;

declare type RunnerType =
    'VM'  |
    'YYC' ;

declare type RuntimePreference = {
    /** Where we should search for the list of runtimes. */
    search_path: string;

    /** Where we should search for the list of users. */
    users_path: string;

    /** Chosen runtime to use. */
    choice: string?;

    /** Chosen user to use. */
    user: string?;
};

/**
 * Representation of a version of a GM runtime.
 */
declare interface IRuntimeVersion {

    readonly year: number;
    readonly month: number;
    readonly major: number;
    readonly build: number;

    /**
     * The expected YY format this runtime requires.
     */
    readonly format: YYProjectFormat;

    /**
     * What type of runtime this is.
     */
    readonly type: GMChannelType;

    /**
     * Returns a negative number if this runtime is older than `other`, 0 for same, or postive for newer.
     */
    compare(other: IRuntimeVersion): number;

    /**
     * Returns whether this runtime version is supported by Constructor.
     */
    supported(): Result<void>;

    /**
     * Returns whether this runtime version is supported by a given project.
     * 
     * Projects on 2023.11 and earlier use a different format to 2024.2 and greater
     * as per [Prefabs Phase 1](https://github.com/YoYoGames/GameMaker-Bugs/issues/3218).
     */
    supportedByProject(project: GMLProject): Result<boolean>;

}

/**
 * Information for a specific found runtime.
 */
declare type RuntimeInfo = {
    version: IRuntimeVersion;
    path: string;
    igor_path: string;
};

/**
 * Information for a specific found user.
 */
declare type UserInfo = {
    path: string;
    name: string;
};

/**
 * Base error type we use to try and be descriptive to the user :)
 */
declare interface IErr extends Error {

    readonly title?: string;
    readonly solution?: string;

    stackFormat(): string;

    toString(): string;

}

declare type MessageSeverity =
    'error'     |
    'warning'   |
    'debug'     ;

declare type Result<T> = 
    { ok: true, data: T }       |
    { ok: false, err: IErr }     ;

/**
 * Settings for running an Igor Job.
 */
declare type IgorSettings = {

    /**
     * Which platform the action will run for.
     */
    platform: IgorPlatform;

    /**
     * The Igor action to run.
     */
    verb: IgorVerb;

    /**
     * Which runner to use - default is VM.
     */
    runner: RunnerType;

    /**
     * How many threads to use for this compilation.
     */
    threads: number;

    /**
     * Name of the Build Config to use for this compilation.
     */
    configName: string;

    /**
     * Path to the user folder. Required for packaging.
     */
    userFolder?: string;

    /**
     * The path to the directory to output build files to.
     */
    buildPath: string;

    /**
     * Launch the executable on the target device after building;
     * same as the "Create Executable and Launch" option in the IDE
     */
    launch?: boolean;

}

/**
 * A supported platform for Igor to target.
 */
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

/**
 * Host (OS) platform information for Igor.
 */
declare type IgorPlatformInfo = {

    /** Extension of the `Igor` executable for the target platform's runtime. */
    platform_executable_extension: string;

    /** Platform-specific path segment of the `Igor` executable. */
    platform_path_name: string;

    /** {@link IgorPlatform} to native build for the host OS. */
    user_platform: IgorPlatform;

    /**
     * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
     * to find runtimes.
     * 
     * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
     * as I don't know where the location is for Linux.
     */
    default_runtime_paths: {
        [key in GMChannelType]: string
    };

    /**
     * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
     * to find user folders.
     * 
     * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
     * as I don't know where the location is for Linux.
     */
    default_user_paths: {
        [key in GMChannelType]: string
    };

    /** Default path to the global build directory. */
    default_global_build_path: string;

}

declare type IgorVerb = 
    'Run'        |
    'Package'    |
    'PackageZip' |
    'Clean'      ;

declare type JobEvent =
    'stdout'    |
    'output'    |
    'stop'      ;

declare type JobStatus = 
    { status: 'running' } |
    { status: 'stopped', stoppedByUser: boolean, exitCode: number };

interface StdoutEntry {
	err: JobError;
	index: number;
	length: number;
}

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

declare type AceWrapOptions = {
	isPrimary?: boolean,
	statusBar?: boolean,
	completers?: boolean,
	linter?: boolean,
	contextMenu?: boolean,
	commands?: boolean,
	inputHelpers?: boolean,
	tooltips?: boolean,
	preferences?: boolean,
	scrollMode?: boolean,
	dispatchEvent?: boolean,
};
	
declare interface GMEditAceTools {
	createEditor(element: string|HTMLElement, options?: AceWrapOptions): AceAjax.Editor;
};

declare class GMEdit {
    
	static aceTools: GMEditAceTools;

	static register(name: string, body: GMPlugin);
    static on(event: GMEditEvent, callback: (event: Event) => void);
    static off(event: GMEditEvent, callback: (event: Event) => void);

}

declare interface IElectronApp {
    getPath:        (name: string) => string;
}

declare interface IElectronFS {
    readFile:       (path: string, cb: ((err?: Error, data?: Buffer) => void)) => void;
    readdir:        (path: string, cb: (err?: Error, files?: string[]) => void) => void;
    mkdir:          (path: string, settings: { recursive: boolean }, cb: (err: Error?) => void) => void;
    writeFile:      (path: string, content: string, cb: (err?: Error) => void) => void;
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
    addDropdown:    (parent: HTMLElement, label: string, value: string, choices: string[], update: (value: string) => void) => HTMLDivElement;
    addGroup:       (parent: HTMLElement, label: string) => HTMLFieldSetElement;
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

declare interface GMLProject {

    name: string;
    displayName: string;
    config: string;
    dir: string;
    path: string;
    properties: GMLProjectPropertiesData;
    isGMS23: boolean;

    /**
     * Synchronously read a YY file to JSON.
     * 
     * @param path The path of the YY file to read.
     * @returns YY file as JSON.
     */
    readYyFileSync: (path: string) => GMLProjectYY;

}

declare type GMLProjectYY = {
    configs: GMLProjectYYConfig;
} & YYFile;

declare type YYFile = {
    resourceVersion: string;
    resourceType: string;
};

declare type GMLProjectYYConfig = {
    children: GMLProjectYYConfig[];
    name: string;
}

/**
 * Project format type for the loaded project.
 */
declare type YYProjectFormat =
    'outdated'  |
    '2023.11'   |
    '2024.2'    |
    '2024.4+'   ;

declare interface GMEditGMLProject {
    current: GMLProject;
}

type UIGroup = { 
    legend: HTMLLegendElement;
} & HTMLFieldSetElement;

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

declare type AceCommand = {
    name: string;
    title?: string;
    bindKey: { win: string, mac: string };
    exec: () => void;
};

declare interface AceCommands {

    add: (command: AceCommand) => void;
    addToPalette: (command: AceCommand) => void;

    remove: (comamnd: AceCommand) => void;
    removeFromPalette: (comamnd: AceCommand) => void;
}

declare interface AceHashHandler {
    addCommand: (command: AceCommand) => void;
    removeCommand: (command: AceCommand, keepCommand: boolean) => void;
}

declare interface GMEditKeyboardShortcuts {
    /**
     * Handler for global keyboard shortcuts.
     */
    hashHandler: AceHashHandler;
}

declare interface ChromeTabs {
    getTabs: () => NodeListOf<ChromeTab>;
}

declare interface ChromeTab extends HTMLDivElement {
    gmlFile: GmlFile;
}

/**
 * Object containing at least the given key(s), and all else optional.
 * @see https://stackoverflow.com/a/57390160/7246439
 */
type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

declare type $GMEdit = {
    'ui.Preferences': GMEditUIPreferences;
    'ui.MainMenu': GMEditUIMainMenu;
    'ui.project.ProjectProperties': GMEditProjectProperties;
    'ui.ChromeTabs': ChromeTabs;
    'ui.KeyboardShortcuts': GMEditKeyboardShortcuts;
    'gml.Project': GMEditGMLProject;
    'editors.Editor': typeof Editor;
    'file.FileKind': typeof FileKind;
    'file.kind.KCode': typeof KCode;
    'gml.file.GmlFile': typeof GmlFile;
    'editors.EditCode': typeof EditCode;
    'ace.AceCommands': AceCommands;
};

declare const $gmedit: $GMEdit;

declare const Electron_App: IElectronApp;
declare const Electron_FS: IElectronFS;
declare const Electron_Dialog: IElectronDialog;

declare interface Window {
    GMConstructor?: GMConstructor;
}
