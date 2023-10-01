
declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare class GMEdit {
    static register = function(name: string, body: GMPlugin) {}
}

declare class Electron_App {
    static getPath = function(name: string): string {}
}

declare class Electron_FS {
    static readFileSync = function(path: string): string {}
    static writeFileSync = function(path: string, content: string) {}
    static existsSync = function(path: string): boolean {}
}
