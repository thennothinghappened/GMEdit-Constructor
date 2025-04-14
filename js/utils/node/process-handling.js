import { Err } from '../Err.js';
import { Error } from '../Result.js';
import { child_process } from './node-import.js';

/**
 * Kill the given process, including all descendant processes.
 * On *NIX, the process given must have been launched with `detached: true` for this to work.
 * 
 * @author [Almenon](https://gist.github.com/Almenon/e32f9b418057ea738687c176816070d6) for core method.
 * 
 * @param {number} pid The PID of the root process in the tree we want to end.
 * @param {string|number} [signal] The signal sent to the processes. (*NIX-only)
 * @returns {Result<void>}
 */
export function killRecursive(pid, signal = 'SIGTERM'){

	try {

		switch (process.platform) {
			
			case 'win32':
				child_process.execSync(`taskkill /PID ${pid} /T /F`);
			break;

			case 'darwin':

				// For whatever reason the trick for the `default` case doesn't work on MacOS.
				// There weren't really any nice sources (that I found) on how to do this, so what
				// I've come up with is effectively:
				//     1. Grab all processes which have the `PPID` of `proc.pid`.
				//     2. Recurse to them, and execute the same.
				//     2. Kill each process up the chain.

				child_process.spawnSync('pgrep', ['-P', pid.toString()])
					.stdout
					.toString('utf-8')
					.split('\n')
					.map(parseInt)
					.filter(it => !isNaN(it))
					.forEach(it => killRecursive(it, signal));

				process.kill(pid, signal);

			break;

			default:
				// See: https://nodejs.org/api/child_process.html#child_process_options_detached
				// If `pid` is less than -1, then the signal is sent to every process in the process group with ID `-pid`.
				process.kill(-pid, signal);
			break;

		}

	} catch (err) {
		return Error(new Err(
			`Failed to recursively kill process tree of PID ${pid}.`,
			err
		));
	}

	return { ok: true };

}
