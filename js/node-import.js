
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
 * @param {import('node:path')} node_path 
 * @param {import('node:child_process')} node_child_process
 */
export function __setup__(node_path, node_child_process) {
	path = node_path;
	child_process = node_child_process;
}
