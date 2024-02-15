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

/**
 * Information for a specific found runtime.
 */
declare type RuntimeInfo = {
    version: string;
    path: string;
    igor_path: string;
};

declare type Result<T> = 
    { ok: true, data: T }       |
    { ok: false, err: Err }     ;

declare type IgorSettings = {
    verb: IgorVerb;
    mode: 'VM'|'YYC';
}

declare type IgorVerb = 
    'Run'       |
    'Package'   |
    'Clean'     ;

declare type JobEvent =
    'stdout'    |
    'stderr'    |
    'output'    |
    'error'     |
    'stop'      ;

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
    static readFile = function(path: string, cb: (err: Error|undefined, data: string|undefined) => void) {}
    static readdir = function(path: string, cb: (err: Error|undefined, files: string[]|undefined) => void) {}
    static writeFile = function(path: string, content: string, cb: (err: Error|undefined) => void) {}
    static existsSync = function(path: string): boolean {}
    static exists = function(path: string, cb: (exists: boolean) => void) {}
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
     * Called by a GmlFile upon creation, initialising said file of this type.
     * Should assign the file.editor by least.
     */
    public init = (file: GmlFile, data: any): void => {
        
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

    public close = (): void => {
        this.editor.stateSave();
        this.editor.destroy();
    }

    public getAceSession = (): AceSession? => {
        return this.codeEditor?.session ?? null;
    }

    public static open = (name: string, path: string, nav?: GmlFileNav): GmlFile? => {
        path = Path.normalize(path);
        // todo: perhaps completely eliminate 'name' from here and rely on file data
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
        // addTab doesn't return the new tab so we bind it up in the 'active tab change' event:
        GmlFile.next = file;
        ui.ChromeTabs.addTab(file.name);
    }

    public rename = (newName: string, newPath: string): void => {
        this.name = newName;
        this.path = newPath;

        this.context = this.kind.getTabContext(this, {});
    }

    public save(): void {

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

        this.kind = file.kind;
        this.element = EditCode.container;
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
    
    override public init = (file: GmlFile, data?: any): void => {
        file.codeEditor = new EditCode(file, modePath);
        file.editor = file.codeEditor;
    }
    
    public loadCode = (editor: EditCode, data?: any): string => {
        return data != null ? data : editor.file.readContent();
    }

    public saveCode = (editor: EditCode, code: string): boolean => {
        if (editor.file.path == null) return false;
        return editor.file.writeContent(code);
    }
    
    /**
     * Executed after getting the code from loadCode for pre-processing
     * @return Modified code
     */
    public preproc = (editor: EditCode, code: string): string => {
        return code;
    }
    
    /**
     * Executed before passing the code to saveCode for post-processing
     * Whatever returned from here is then passed to saveCode.
     * @return New code or null on error
     */
    public postproc = (editor: EditCode, code: string): string => {
        return code;
    }
    
    public gatherGotoTargets = (editor: EditCode): AceAutoCompleteItems|null => {
        return null;
    }
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
    
    public locals: Dictionary<GmlLocals> = GmlLocals.defaultMap;
    public imports: Dictionary<GmlImports> = GmlImports.defaultMap;
    
    public lambdaList: Array<string> = [];
    public lambdaMap: Dictionary<string> = new Dictionary();
    public lambdas: Dictionary<GmlExtLambda> = new Dictionary();
    
    constructor(file: GmlFile, modePath: string) {
        super(file);
        this.kind = file.kind;
        this.modePath = modePath;
        this.element = container;
    }
    
    override public ready = (): void => {
        if (GmlAPI.version.config.indexingMode == Local) {
            GmlSeeker.runSync(file.path, file.code, null, file.kind);
        }

        let _prev = currentNew;
        currentNew = this;
        // todo: this does not seem to cache per-version, but not a performance hit either?
        
        session = AceTools.createSession(file.code, { path: modePath, version: GmlAPI.version });
        AceTools.bindSession(session, this);
        
        if (Project.current != null && Project.current.properties.indentWithTabs != null) {
            session.setOption('useSoftTabs', !Project.current.properties.indentWithTabs);
        } else if (Preferences.current.detectTab) {
            if (Nativestring.contains(file.code, '\n\t')) {
                session.setOption('useSoftTabs', false);
            } else if (Nativestring.contains(file.code, '\n  ')) {
                session.setOption('useSoftTabs', true);
            } else {
                session.setOption('useSoftTabs', Preferences.current.tabSpaces);
            }
        } else {
            session.setOption('useSoftTabs', Preferences.current.tabSpaces);
        }

        if (Project.current != null && Project.current.properties.indentSize != null) {
            session.setOption('tabSize', Std.int(Project.current.properties.indentSize));
        }

        Preferences.hookSetOption(session);

        if (modePath === 'ace/mode/javascript') {
            session.setOption('useWorker', false);
        }
        
        currentNew = _prev;
        
        let data = file.path != null ? GmlSeekData.map[file.path] : null;
        if (data != null) {
            locals = data.locals;
            if (data.imports != null) imports = data.imports;
        }
    }
    
    override public stateLoad = () => {
        if (file.path != null) AceSessionData.restore(this);
    }
    override public stateSave = () => {
        AceSessionData.store(this);
    }
    
    override public focusGain = (prev:Editor): void => {
        super.focusGain(prev);
        Main.aceEditor.setSession(session);
    }
    
    public setLoadError = (text: string) => {
        file.code = text;
        file.path = null;
        file.kind = KExtern.inst;
        return text;
    }
    override public load = (data: any): void => {
        let src = kind.loadCode(this, data);
        src = kind.preproc(this, src);
        file.code = src;
        file.syncTime();
    }
    
    public postpImport = (val: string): { val: string, sessionChanged: boolean } => {
        let val_preImport = val;
        let path = file.path;

        val = GmlExtImport.post(val, this);

        if (val == null) {
            Dialog.showError(GmlExtImport.errorText);
            return null;
        }

        // if there are imports, check if we should be updating the code
        let data = path !== null ? GmlSeekData.map[path] : null;
        let sessionChanged = false;
        let hadImports = data != null && data.imports !== null;

        if (hadImports || GmlExtImport.post_numImports > 0) {
            let next = GmlExtImport.pre(val, this);

            if (data != null && data.imports != null) {
                imports = data.imports;
            } else imports = GmlImports.defaultMap;

            if (next != val_preImport) {
                const sd = AceSessionData.get(this);
                const session = session;
                session.doc.setValue(next);
                AceSessionData.set(this, sd);
                sessionChanged = true;

                Main.window.setTimeout(() => {
                    const undoManager = session.getUndoManager();

                    if (!Preferences.current.allowImportUndo) {
                        session.setUndoManager(undoManager);
                        undoManager.reset();
                    }

                    undoManager.markClean();
                    file.changed = false;
                });
            } else if (!hadImports) {
                // if we didn't have imports before, data.imports would
                // be null and thus our imports were left untransformed.
                // But now they are OK so we can do it again and right.
                val = GmlExtImport.post(val_preImport, this);
                if (val == null) {
                    Main.window.alert(GmlExtImport.errorText);
                    return null;
                }
            }
        }

        return { val: val, sessionChanged: sessionChanged };
    }
    
    public setSaveError = (text:string): void => {
        Dialog.showError(text);
    }

    override public save = (): boolean => {
        let code = session.getValue();
        GmlFileBackup.save(file, code);
        
        code = kind.postproc(this, code);
        if (code == null) return false;
        
        let ok = kind.saveCode(this, code);
        if (!ok) return false;
        
        file.savePost(code);
        return true;
    }

    override public checkChanges = (): void => {
        const act = Preferences.current.fileChangeAction;
        if (act == null) return;

        const status = kind.checkForChanges(this);

        if (status < 0) {
            switch (Dialog.showMessageBox({
                title: 'File missing: ' + file.name,
                message: 'The source file is no longer found on disk. '
                    + 'What would you like to do?',
                buttons: [
                    'Keep editing',
                    'Close the file'
                ], cancelId: 0,
            })) {
                case 1: {
                    file.path = null;
                    Main.window.setTimeout(function() {
                        file.tabEl.querySelector('.chrome-tab-close').click();
                    });
                    return;
                };
                default: file.path = null;
            }
            return;
        }

        if (status > 0) try {
            let prev = file.code;
            file.load();
            
            const rxr = /\\r/g;
            let check_0 = Nativestring.trimRight(prev);
            check_0 = Nativestring.replaceExt(check_0, rxr, '');
            let check_1 = Nativestring.trimRight(file.code);
            check_1 = Nativestring.replaceExt(check_1, rxr, '');
            
            const finishChange = (): void => {
                session.setValue(file.code);
                plugins.PluginEvents.fileReload({file:file});
                let path = file.path;

                if (path != null) {
                    const data = GmlSeekData.map[path];
                    if (data != null) {
                        kind.index(path, file.readContent(), data.main, true);
                        if (GmlAPI.version.config.indexingMode == Local) file.liveApply();
                        session.gmlScopes.updateOnSave();
                        let next = GmlSeekData.map[path];
                        if (locals != locals) {
                            locals = locals;
                            if (GmlFile.current == file) session.bgTokenizer.start(0);
                        }
                    }
                }
                if (kind === KGml && kind.canSyntaxCheck) {
                    let check = parsers.linter.GmlLinter.getOption(q.q.onLoad);
                    if (check) parsers.linter.GmlLinter.runFor(this);
                }
            }

            let dlg: number = 0;
            if (check_0 == check_1) {
                // OK!
            } else if (!file.changed) {
                if (act != Ask) {
                    finishChange();
                } else dlg = 1;
            } else dlg = 2;

            if (dlg != 0) {
                printSize = (b: number) => {
                    toFixed = (f: number):string => {
                        return f(2);
                    }
                    if (b < 10000) return b + 'B';
                    b /= 1024;
                    if (b < 10000) return toFixed(b) + 'KB';
                    b /= 1024;
                    if (b < 10000) return toFixed(b) + 'MB';
                    b /= 1024;
                    return toFixed(b) + 'GB';
                }
                let sz1 = printSize(file.code.length);
                let sz2 = printSize(session.getValue().length);
                let bt = Dialog.showMessageBox({
                    title: 'File conflict for ' + file.name,
                    message: 'Source file changed ($sz1) ' + (dlg == 2
                        ? 'but you have unsaved changes ($sz2)'
                        : 'while the current version is $sz2'
                    ) + '. What would you like to do?',
                    buttons: ['Reload file', 'Keep current', 'Open changes in a new tab'],
                    cancelId: 1,
                });

                switch (bt) {
                    case 0: {
                        finishChange();
                    };
                    case 1: { };
                    case 2: {
                        let name1 = file.name + ' <copy>';
                        GmlFile.next = new GmlFile(name1, null, file.kind, file.code);
                        ui.ChromeTabs.addTab(name1);
                    };
                }
            }
        } catch (e: any) {
            Main.console.error('Error applying changes: ', e);
        }
    }
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
