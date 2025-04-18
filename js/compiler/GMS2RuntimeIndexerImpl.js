import { readdir } from '../utils/node/file.js';
import * as nodeModulesProvider from '../utils/node/node-import.js';
import { Err, Ok } from '../utils/Result.js';
import { GMRuntimeVersion } from './GMVersion.js';
import { igor_path_segment } from './igor-paths.js';

/**
 * @implements {GMS2.RuntimeIndexer}
 */
export class GMS2RuntimeIndexerImpl {

	/**
	 * @type {GMS2.RuntimeIndexer['getRuntimes']}
	 */
	async getRuntimes(path) {

		const dirContents = await readdir(path);
		
		if (!dirContents.ok) {
			return Err({ code: 'pathReadError', inner: dirContents.err });
		}

		/** @type {GMS2.RuntimeIndexer.InvalidRuntimeInfo[]} */
		const invalidRuntimes = [];

		const runtimes = dirContents.data
			.map(dirname => ({ dirname, path: nodeModulesProvider.path.join(path, dirname) }))
			.filter(({ path }) => Electron_FS.lstatSync(path).isDirectory())
			.map(({ dirname, path }) => {

				const igorPath = nodeModulesProvider.path.join(path, igor_path_segment);
				const version = GMRuntimeVersion.parse(dirname);

				if (!version.ok) {

					invalidRuntimes.push({
						path,
						error: {
							code: 'versionParseFailed',
							inner: version.err
						}
					});

					return undefined;

				}

				return { path, igorPath, version: version.data };

			})
			.filter(runtime => runtime !== undefined)
			.filter(runtime => Electron_FS.existsSync(runtime.igorPath))
			.sort((a, b) => b.version.compare(a.version));

		return Ok({
			runtimes,
			invalidRuntimes
		});

	}

}
