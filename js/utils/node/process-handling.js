import { Err } from '../Err.js';
import { child_process } from './node-import.js';

/**
 * Kill the given process, including all descendant processes.
 * On *NIX, the process given must have been launched with `detached: true` for this to work.
 * 
 * @author [Almenon](https://gist.github.com/Almenon/e32f9b418057ea738687c176816070d6) for core method.
 * 
 * @param {number} pid The Process ID of the process we want to end.
 * @param {string|number} [signal] The signal sent to the processes. (*NIX-only)
 * @returns {Result<void>}
 */
export function killRecursive(pid, signal = 'SIGTERM'){

	try {

		if (process.platform === 'win32') {
			child_process.execSync(`taskkill /PID ${pid} /T /F`);
		} else {
			// See: https://nodejs.org/api/child_process.html#child_process_options_detached
			// If `pid` is less than -1, then the signal is sent to every process in the process group with ID `-pid`.
			process.kill(-pid, signal);
		}

	} catch (err) {
		return {
			ok: false,
			err: new Err(`Failed to recursively kill process tree of PID ${pid}.`, err)
		};
	}

	return { ok: true };

}
