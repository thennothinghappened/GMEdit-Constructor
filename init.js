// really bad workaround that should (hopefully) work to
// allow using es modules, since they're way nicer to work with.
(() => {

    const plugin_name = 'GMEdit-Constructor';
    const version = '0.2.0';

    const child_process = require('node:child_process');
    const path = require('node:path');

    /** @type {import('./constructor.js').GMConstructor} */
    let gmConstructor;

    const load = (async () => {
        const { GMConstructor } = await import('./constructor.js');
        gmConstructor = new GMConstructor(plugin_name, version, process, child_process, path);
    })();

    GMEdit.register(plugin_name, {
        init: async () => {
            await load;
        },
        cleanup: async () => {
            await load;
            gmConstructor.cleanup();
        }
    });

})();
