/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

	const plugin_name = 'GMEdit-Constructor';
	const plugin_version = '0.16.3';

	const node_child_process = require('node:child_process');
	const node_path = require('node:path');

	const load = (async () => {

		/** Whether we are reloading from another existing instance. */
		let reloading = false;

		if ('GMConstructor' in window && window.GMConstructor !== undefined) {
			reloading = true;
			await window.GMConstructor.cleanup();
		}

		const { GMConstructor } = await import('./js/GMConstructor.js');

		const res = await GMConstructor
			.create(plugin_name, plugin_version, node_path, node_child_process, reloading)
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

	window.GMEdit.register(plugin_name, {
		init: async () => {
			await load();
		},
		cleanup: async () => {
			await window.GMConstructor?.cleanup();
		}
	});

})();
