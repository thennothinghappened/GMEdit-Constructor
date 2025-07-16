/**
 * Evil workaround to use ES modules in a project that wasn't designed
 * for them, because I like using them too much :)
 */
(() => {

	const PLUGIN_NAME = 'GMEdit-Constructor';
	const PLUGIN_VERSION = '0.22.0';

	/** @type {NodeModules} */
	const nodeModules = {
		path: require('node:path'),
		child_process: require('node:child_process')
	};

	/**
	 * Make sure we aren't running on rosetta, since GMEdit has
	 * a native build and Rosetta seems to cause some weirdness!
	 */
	function isRunningInRosetta() {
		if (process.platform !== 'darwin') {
			return false;
		}

		if (process.arch !== 'x64') {
			return false;
		}

		const output = nodeModules.child_process
			.execSync('sysctl -in sysctl.proc_translated')
			.toString('utf-8');

		// If the return of this command is 1, we are running in Rosetta.
		return output.includes('1');
	}

	GMEdit.register(PLUGIN_NAME, {
		init: async function() {
			if (isRunningInRosetta()) {
				return Electron_Dialog.showMessageBox({
					title: 'GMEdit-Constructor cannot load on Rosetta!',
					message: `${PLUGIN_NAME} does not work correctly on Rosetta - please consider using GMEdit's native Arm64 build found at https://yellowafterlife.itch.io/gmedit`,
					buttons: ['Dismiss'],
					type: 'error'
				});
			}

			if (window.ConstructorPlugin !== undefined) {
				window.ConstructorPlugin.destroy();
			}

			const res = await import('./js/ConstructorPlugin.js')
				.then(({ ConstructorPlugin }) => ConstructorPlugin.initialize(PLUGIN_NAME, PLUGIN_VERSION, nodeModules))
				.catch(err => /** @type {Result<import('./js/ConstructorPlugin').ConstructorPlugin>} */ ({ ok: false, err }));

			if (!res.ok) {
				console.error('Failed to launch Constructor!', res.err);
				alert('Failed to launch Constructor, see the JavaScript console for details.');

				return;
			}

			window.ConstructorPlugin = res.data;
		},
		cleanup: function() {
			if (window.ConstructorPlugin !== undefined) {
				window.ConstructorPlugin?.destroy();
				delete window.ConstructorPlugin;
			}
		}
	});

})();
