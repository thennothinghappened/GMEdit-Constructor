/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

    const plugin_name = 'GMEdit-Constructor';
    const plugin_version = '0.5.1';

    const node_child_process = require('node:child_process');
    const node_path = require('node:path');

    /** @type {import('./js/GMConstructor.js').GMConstructor?} */
    window.GMConstructor = null;

    const load = (async () => {
        const { GMConstructor } = await import('./js/GMConstructor.js');
        window.GMConstructor = await GMConstructor.create(plugin_name, plugin_version, node_path, node_child_process);
    });

    GMEdit.register(plugin_name, {
        init: async () => {
            await window.GMConstructor?.cleanup();
            await load();
        },
        cleanup: async () => {
            await window.GMConstructor?.cleanup();
        }
    });

})();
