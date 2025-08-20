import { BaseError } from '../utils/Err.js';
import { Err, Ok } from '../utils/Result.js';
import { docString } from '../utils/StringUtils.js';

const expectedVersionFormat = 'year.month.major.patch';
const expectedRuntimeVersionFormat = 'runtime-' + expectedVersionFormat;

/**
 * @implements {Eq<GMVersion>}
 */
export class GMVersion {

	/**
	 * Try to parse a GM version from a string.
	 * 
	 * @param {String} str 
	 * @returns {Result<GMVersion>}
	 */
	static parse(str) {

		/** @type {[number, number, number, number]} */
		// @ts-expect-error We check this immediately after.
		const numbers = str
			.split('.')
			.map(number => Number(number));

		if (numbers.length !== 4) {
			return Err(new BaseError(docString(`
				Expected runtime version to be in format '${expectedVersionFormat}' - 4 values,
				found '${str}' - ${numbers.length} values.
			`)));
		}

		for (const number of numbers) {
			if (isNaN(number)) {
				return Err(new BaseError(`String '${str}' has a NaN runtime value`));
			}
		}

		return Ok(new GMVersion(...numbers));

	}

	/**
	 * @param {Number} year 
	 * @param {Number} month 
	 * @param {Number} major 
	 * @param {Number} build 
	 */
	constructor(year, month, major, build) {
		this.year = year;
		this.month = month;
		this.revision = major;
		this.build = build;
	}

	/**
	 * Returns a negative number if this version is older than `other`, 0 for same, or positive for
	 * newer.
	 * 
	 * @param {GMVersion} other 
	 */
	compare(other) {

		const year_diff = this.year - other.year;

		if (year_diff !== 0) {
			return Math.sign(year_diff);
		}

		const month_diff = this.month - other.month;

		if (month_diff !== 0) {
			return Math.sign(month_diff);
		}

		const major_diff = this.revision - other.revision;

		if (major_diff !== 0) {
			return Math.sign(major_diff);
		}

		const build_diff = this.build - other.build;

		if (build_diff !== 0) {
			return Math.sign(build_diff);
		}

		return 0;

	}

	/**
	 * Determine whether this version is equivalent to `other`.
	 * 
	 * @param {GMVersion} other
	 * @returns {boolean}
	 */
	equals(other) {
		return this.compare(other) === 0;
	}

	toString() {
		return `${this.year}.${this.month}.${this.revision}.${this.build}`;
	}

}

export class GMRuntimeVersion extends GMVersion {

	/**
	 * Try to parse a runtime version from a string.
	 * 
	 * @param {String} str 
	 * @returns {Result<GMRuntimeVersion>}
	 */
	static parse(str) {

		const split = str.split('runtime-');

		if (split.length !== 2) {
			return Err(new BaseError(docString(`
				Expected runtime version to be in format '${expectedRuntimeVersionFormat}', found
				'${str}'
			`)));
		}

		const versionRes = GMVersion.parse(split[1]);

		if (!versionRes.ok) {
			return Err(new BaseError(
				`Expected runtime version to be in format '${expectedRuntimeVersionFormat}', found '${str}'`,
				versionRes.err
			));
		}

		return Ok(new GMRuntimeVersion(
			versionRes.data.year,
			versionRes.data.month,
			versionRes.data.revision,
			versionRes.data.build
		));

	}

	/**
	 * Find an available runtime compatible with the given project version.
	 * 
	 * @param {GMS2.RuntimeProvider} runtimeProvider Method of listing available runtimes.
	 * @param {GMVersion} projectVersion Version of the project we are tasked with matching against.
	 * @param {GM.ReleaseChannel | undefined} [channel] The channel to query. If unspecified, all channels will be queried in order of specificity.
	 * @returns {Result<GMS2.FindCompatibleRuntimeData, GMS2.FindCompatibleRuntimeError>}
	 */
	static findCompatibleRuntime(runtimeProvider, projectVersion, channel) {
		if (channel !== undefined) {
			
			const runtimes = runtimeProvider.getRuntimes(channel);

			if (runtimes === undefined) {
				return Err({ type: 'channel-empty', channel });
			}

			const runtime = this.findCompatibleRuntimeInChannel(projectVersion, runtimes);

			if (runtime === undefined) {
				return Err({ type: 'none-compatible', channel });
			}

			return Ok({ runtime, channel });

		}

		// Beta runtimes use major versions of months, multiplied by 100. Thus, encountering this, we
		// know the project is on a beta build.
		if (projectVersion.month >= 100) {
			return this.findCompatibleRuntime(runtimeProvider, projectVersion, 'Beta');
		}

		/**
		 * The order to check in. Our order is based on the release frequency of the channels, as this
		 * also matches with their stability. We want to ideally pick the most-stable option, if there
		 * are multiple possible matches.
		 * 
		 * @type {GM.ReleaseChannel[]}
		 */
		const CHANNEL_QUERY_ORDER = ['LTS', 'Stable', 'Beta'];

		for (const channel of CHANNEL_QUERY_ORDER) {

			const result = this.findCompatibleRuntime(runtimeProvider, projectVersion, channel);

			if (result.ok) {
				return result;
			}

		}

		return Err({ type: 'none-compatible' });
	}

	/**
	 * Find an available runtime compatible with the given project version in the given channel.
	 * 
	 * @private
	 * @param {GMVersion} projectVersion Version of the project we are tasked with matching against.
	 * @param {NonEmptyArray<GMS2.RuntimeInfo>} runtimes List of runtimes in the channel.
	 * @returns {GMS2.RuntimeInfo|undefined}
	 */
	static findCompatibleRuntimeInChannel(projectVersion, runtimes) {
		for (const runtime of [...runtimes].sort((a, b) => b.version.compare(a.version))) {
			
			if (runtime.version.year !== projectVersion.year) {
				continue;
			}

			if (runtime.version.month !== projectVersion.month) {
				continue;
			}

			if (runtime.version.revision !== projectVersion.revision) {
				continue;
			}

			return runtime;

		}

		return undefined;
	}

	toString() {
		return `runtime-${super.toString()}`;
	}

}
