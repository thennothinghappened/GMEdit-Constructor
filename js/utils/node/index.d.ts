
import * as Path from 'node:path';
import * as ChildProcess from 'node:child_process';

export declare global {

	/**
	 * Modules imported from NodeJS that Constructor uses to provide various filesystem functions.
	 * 
	 * FIXME: remove dependency on Node by abstracting uses of these. We already do this to an
	 * extent by exposing `async` functions.
	 */
	type NodeModules = readonly {
		/**
		 * Re-export of Node's `path` module.
		 */
		readonly path: typeof Path;

		/** 
		 * Re-export of Node's `child_process` module.
		 */
		readonly child_process: typeof ChildProcess;
	};

}
