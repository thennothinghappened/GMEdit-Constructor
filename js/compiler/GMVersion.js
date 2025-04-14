import { Err } from '../utils/Err.js';
import { project_format_get } from '../utils/project.js';
import { Error, Ok } from '../utils/Result.js';

const expectedVersionFormat = 'year.month.major.patch';
const expectedRuntimeVersionFormat = 'runtime-' + expectedVersionFormat;

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
			return Error(new Err(`Expected runtime version to be in format '${expectedVersionFormat}' - 4 values, found '${str}' - ${numbers.length} values.`));
		}

		for (const number of numbers) {
			if (isNaN(number)) {
				return Error(new Err(`String '${str}' has a NaN runtime value`));
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
		this.major = major;
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

		const major_diff = this.major - other.major;

		if (major_diff !== 0) {
			return Math.sign(major_diff);
		}

		const build_diff = this.build - other.build;

		if (build_diff !== 0) {
			return Math.sign(build_diff);
		}

		return 0;

	}

	toString() {
		return `${this.year}.${this.month}.${this.major}.${this.build}`;
	}

}

export class GMRuntimeVersion {

	/**
	 * The underlying version data of this runtime.
	 * 
	 * @private
	 * @type {GMVersion}
	 */
	version;

	/**
	 * @param {GMVersion} version
	 */
	constructor(version) {
		this.version = version;
	}

	/**
	 * The expected YY format this runtime requires.
	 * @returns {YYProjectFormat}
	 */
	get format() {

		// All 2023 or lower are YYv1.
		if (this.version.year < 2024) {
			return '2023.11';
		}

		// The turmoil of 2024's many project formats!
		if (this.version.year === 2024) {

			// Runtime 2024.200.0.490 was first to YYv2.
			if (this.version.month === 200) {
				if (this.version.build < 490) {
					return '2023.11';
				} else {
					return '2024.2';
				}
			}

			// 2024.2 is incompatible with 2024.4+.
			if (this.version.month === 2) {
				return '2024.2';
			}

			// 2024.4 is incompatible with 2024.6+.
			if (this.version.month === 4 || this.version.month === 400) {
				return '2024.4';
			}

			// 2024.6 is incompatible with 2024.8+.
			if (this.version.month === 6 || this.version.month === 600) {
				return '2024.6';
			}

			// 2024.8 is incompatible with 2024.11+.
			if (this.version.month === 8 || this.version.month === 800) {
				return '2024.8';
			}

			// 2024.8 is incompatible with 2024.11+.
			if (this.version.month === 11 || this.version.month === 1100) {
				return '2024.11';
			}
			
		}

		return '2024.13+';

	}

	/**
	 * Returns a negative number if this runtime is older than `other`, 0 for same, or positive for
	 * newer.
	 * 
	 * @param {GMRuntimeVersion} other 
	 */
	compare(other) {
		return this.version.compare(other.version);
	}

	/**
	 * Returns whether this runtime version is supported by Constructor.
	 * 
	 * @returns {Result<void>}
	 */
	supported() {
		return { ok: true };
	}

	/**
	 * Returns whether this runtime version is supported by a given project.
	 * 
	 * Projects on 2023.11 and earlier use a different format to 2024.2 and greater
	 * as per [Prefabs Phase 1](https://github.com/YoYoGames/GameMaker-Bugs/issues/3218).
	 * 
	 * @param {GMEdit.Project} project 
	 * @returns {Result<boolean>}
	 */
	supportedByProject(project) {

		const projectFormatRes = project_format_get(project);

		if (!projectFormatRes.ok) {
			return Error(new Err(
				'Failed to check if this runtime version is supported by the given project',
				projectFormatRes.err
			));
		}

		return Ok(projectFormatRes.data === this.format);

	}

	toString() {
		return `runtime-${this.version}`;
	}

	/**
	 * Try to parse a runtime version from a string.
	 * 
	 * @param {String} str 
	 * @returns {Result<GMRuntimeVersion>}
	 */
	static parse(str) {

		const split = str.split('runtime-');

		if (split.length !== 2) {
			return Error(new Err(`Expected runtime version to be in format '${expectedRuntimeVersionFormat}', found '${str}'`));
		}

		const versionRes = GMVersion.parse(split[1]);

		if (!versionRes.ok) {
			return Error(new Err(
				`Expected runtime version to be in format '${expectedRuntimeVersionFormat}', found '${str}'`,
				versionRes.err
			));
		}

		return Ok(new GMRuntimeVersion(versionRes.data));

	}

}
