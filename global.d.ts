
declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare type GMEdit_Event =
    'preferencesBuilt';

declare class GMEdit {
    static register = function(name: string, body: GMPlugin) {}
    static on = function(event: GMEdit_Event, callback: (event: Event) => void) {}
}

declare class Electron_App {
    static getPath = function(name: string): string {}
}

declare class Electron_FS {
    static readFileSync = function(path: string): string {}
    static writeFileSync = function(path: string, content: string) {}
    static existsSync = function(path: string): boolean {}
}

declare class GMConstructor {
    static plugin_name: string
    static version: string

    static preferences: {

    }

    static init: () => void
    static cleanup: () => void
}

declare const $gmedit = {
    'ui.Preferences': {
        addText:        (el: HTMLElement, label: string): HTMLElement => {},
        addCheckbox:    (el: HTMLElement, label: string, value: boolean, update: (value: boolean) => void): HTMLElement => {},
        addInput:       (el: HTMLElement, label: string, value: boolean, update: (value: boolean) => void): HTMLElement => {}
    }
};
