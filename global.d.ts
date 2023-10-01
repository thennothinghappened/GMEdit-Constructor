
declare type GMPlugin = {
    init: () => void,
    cleanup: () => void
}

declare class GMEdit {
    static register = function(name: string, body: GMPlugin) {}
}
