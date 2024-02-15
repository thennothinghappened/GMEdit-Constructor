/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

    const plugin_name = 'GMEdit-Constructor';
    const plugin_version = '0.8.1';

    const node_child_process = require('node:child_process');
    const node_path = require('node:path');

    const load = (async () => {
        await window.GMConstructor?.cleanup();

        const { GMConstructor } = await import('./js/GMConstructor.js');
        window.GMConstructor = await GMConstructor.create(plugin_name, plugin_version, node_path, node_child_process);
    });

    GMEdit.register(plugin_name, {
        init: async () => {
            await load();
        },
        cleanup: async () => {
            await window.GMConstructor?.cleanup();
        }
    });

})();
