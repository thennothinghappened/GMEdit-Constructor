import { Err, Ok } from '../utils/Result.js';
import { GMRuntimeVersion } from './GMVersion.js';
import { HOST_PLATFORM_EXECUTABLE_EXTENSION, HOST_PLATFORM_PLATFORM_PATH_NAME } from './igor-paths.js';
/**
 * @implements {GMS2.RuntimeIndexer}
 */
export class GMS2RuntimeIndexerImpl {

	/**
	 * @param {DiskIO} diskIO
	 */
	constructor(diskIO) {
		/** @private */
		this.diskIO = diskIO;

		/**
		 * @private
		 * @readonly
		 */
		this.igorPathSegment = this.diskIO.joinPath(
			'bin',
			'igor',
			HOST_PLATFORM_PLATFORM_PATH_NAME,
			process.arch,
			`Igor${HOST_PLATFORM_EXECUTABLE_EXTENSION}`
		);
	}

	/**
	 * @type {GMS2.RuntimeIndexer['getRuntimes']}
	 */
	async getRuntimes(path) {

		const dirContents = await this.diskIO.readDir(path);
		console.log(dirContents)
		
		if (!dirContents.ok) {
			return Err({ code: 'pathReadError', inner: dirContents.err });
		}

		/** @type {GMS2.RuntimeIndexer.InvalidRuntimeInfo[]} */
		const invalidRuntimes = [];

		const runtimes = dirContents.data
			.map(dirname => ({ dirname, path: this.diskIO.joinPath(path, dirname) }))
			.filter(({ path }) => this.diskIO.isDirectorySync(path))
			.map(({ dirname, path }) => {

				const igorPath = this.diskIO.joinPath(path, this.igorPathSegment);
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
			.filter(runtime => this.diskIO.existsSync(runtime.igorPath))
			.sort((a, b) => b.version.compare(a.version));

		return Ok({
			runtimes,
			invalidRuntimes
		});

	}

}
