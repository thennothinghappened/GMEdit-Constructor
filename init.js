/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

	const plugin_name = 'GMEdit-Constructor';
	const plugin_version = '0.20.2';

	const node_child_process = require('node:child_process');
	const node_path = require('node:path');

	const load = (async () => {

		if ('GMConstructor' in window && window.GMConstructor !== undefined) {
			await window.GMConstructor.cleanup();
		}

		const res = await import('./js/GMConstructor.js')
			.then(({ GMConstructor }) => 
				GMConstructor.create(plugin_name, plugin_version, node_path, node_child_process)
			)
			.catch(err => /** @type {Result<import('js/GMConstructor.js').GMConstructor>} */ ({
				ok: false,
				err: err
			}));

		if (res.ok === false) {
			
			alert('Failed to launch Constructor, see the JavaScript console for details.');
			console.error('Failed to launch Constructor!', res.err);

			return;
		}

		window.GMConstructor = res.data;

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
