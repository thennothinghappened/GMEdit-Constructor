
declare type GMConstructorPreferencesData = {
    
}

declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare let gmConstructor: GMConstructor;

declare type GMEdit_Event =
    'preferencesBuilt' |
    'projectPropertiesBuilt' |
    'projectOpen' |
    'projectClose';

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
    addInput:       (el: HTMLElement, label: string, value: boolean, update: (value: boolean) => void) => HTMLElement;
}

declare interface GMEditUIMainMenu {
    menu: Electron_Menu
}

declare type $GMEdit = {
    'ui.Preferences': GMEditUIPreferences;
    'ui.MainMenu': GMEditUIMainMenu;
};

declare const $gmedit: $GMEdit;
