
/**
 * Re-export of Node's `path` module.
 * @type {import('node:path')}
 */
export let path;

/** 
 * Re-export of Node's `child_process` module.
 * @type {import('node:child_process')}
 */
export let child_process;

/**
 * @param {NodeModules} nodeModules 
 */
export function inject(nodeModules) {
	path = nodeModules.path;
	child_process = nodeModules.child_process;
}
