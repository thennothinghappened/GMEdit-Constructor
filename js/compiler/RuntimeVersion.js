import { Err } from '../utils/Err.js';

/**
 * @implements {IRuntimeVersion}
 */
export class RuntimeVersion {

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
     * Returns a negative number if this runtime is older than `other`, 0 for same, or postive for newer.
     * @param {RuntimeVersion} other 
     */
    compare(other) {

        const year_diff = this.year - other.year;

        if (year_diff !== 0) {
            return Math.sign(year_diff);
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
        return `runtime-${this.year}.${this.month}.${this.major}.${this.build}`;
    }

}

/**
 * Attempt to parse a runtime version from a string.
 * @param {String} str 
 * @returns {Result<IRuntimeVersion>}
 */
export function runtime_version_parse(str) {

    const expected_format = 'runtime-year.month.major.patch';

    const split = str.split('runtime-');

    if (split.length !== 2) {
        return {
            ok: false,
            err: new Err(`Expected runtime version to be in format '${expected_format}', found '${str}'`)
        }
    }

    /** @type {[number, number, number, number]} */
    // @ts-ignore
    const numbers = split[1]
        .split('.')
        .map(number => Number(number));

    if (numbers.length !== 4) {
        return {
            ok: false,
            err: new Err(`Expected runtime version to be in format '${expected_format}' - 4 values, found '${str}' - ${numbers.length} values.`)
        };
    }

    for (const number of numbers) {
        if (isNaN(number)) {
            return {
                ok: false,
                err: new Err(`String '${str}' has a NaN runtime value`)
            };
        }
    }

    return {
        ok: true,
        data: new RuntimeVersion(...numbers)
    };

}