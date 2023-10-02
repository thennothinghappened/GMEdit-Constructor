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

declare type $GMEdit = {
    'ui.Preferences': GMEditUIPreferences;
    'ui.MainMenu': GMEditUIMainMenu;
    'gml.Project': GMEditGMLProject;
};

declare const $gmedit: $GMEdit;
