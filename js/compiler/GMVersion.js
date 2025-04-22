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

	toString() {
		return `runtime-${super.toString()}`;
	}

}
