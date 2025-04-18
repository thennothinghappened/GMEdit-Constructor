/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

	const PLUGIN_NAME = 'GMEdit-Constructor';
	const PLUGIN_VERSION = '0.21.0';

	/** @type {NodeModules} */
	const nodeModules = {
		path: require('node:path'),
		child_process: require('node:child_process')
	};

	const load = (async () => {

		if ('GMConstructor' in window && window.GMConstructor !== undefined) {
			window.GMConstructor.destroy();
		}

		const res = await import('./js/GMConstructor.js')
			.then(({ GMConstructor }) => GMConstructor.initialize(PLUGIN_NAME, PLUGIN_VERSION, nodeModules))
			.catch(err => /** @type {Result<import('js/GMConstructor.js').GMConstructor>} */ ({
				ok: false,
				err: err
			}));

		if (!res.ok) {
			
			alert('Failed to launch Constructor, see the JavaScript console for details.');
			console.error('Failed to launch Constructor!', res.err);

			return;
		}

		window.GMConstructor = res.data;

	});

	GMEdit.register(PLUGIN_NAME, {
		init: async () => {
			await load();
		},
		cleanup: () => {
			window.GMConstructor?.destroy();
		}
	});

})();
