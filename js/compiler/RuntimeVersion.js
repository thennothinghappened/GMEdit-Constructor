import { Err } from '../utils/Err.js';

/**
 * @implements {IRuntimeVersion}
 */
export class RuntimeVersion {

    /**
     * @param {RuntimeChannelType} type 
     * @param {Number} year 
     * @param {Number} month 
     * @param {Number} major 
     * @param {Number} build 
     */
    constructor(type, year, month, major, build) {
        this.type = type;
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

    /**
     * Returns whether this runtime version is supported by Constructor.
     * At the moment, as LTS is broken (for unknown reasons), this means LTS runtimes
     * are excluded, as as is >=2024.2 Stable, or >=2024.200.0.490 Beta, which
     * contain the project format changes (which GMEdit does not yet support.)
     * 
     * @returns {Result<void>}
     */
    supported() {

        if (this.type === 'LTS' || this.year <= 2022) {
            return {
                ok: false,
                err: new Err(`LTS or <=2022 builds are currently non-functional (see https://github.com/thennothinghappened/GMEdit-Constructor/issues/5)`)
            }
        }

        if (this.year < 2024) {
            return {
                ok: true,
                data: undefined
            };
        }

        let limit;

        switch (this.type) {
            case 'Beta': {
                limit = new RuntimeVersion('Beta', 2024, 200, 0, 490);
                break;
            }

            case 'Stable': {
                limit = new RuntimeVersion('Beta', 2024, 2, 0, 0);
                break;
            }
        }

        if (this.compare(limit) >= 0) {
            return {
                ok: false,
                err: new Err(`${this.type} runtimes >=${limit} are not supported (this runtime = ${this}) due to GM's Prefabs Stage 1, not yet supported by GMEdit.`)
            };
        }

        return {
            ok: true,
            data: undefined
        };

    }

    toString() {
        return `runtime-${this.year}.${this.month}.${this.major}.${this.build}`;
    }

}

window.RuntimeVersion = RuntimeVersion;

/**
 * Attempt to parse a runtime version from a string.
 * @param {RuntimeChannelType} type
 * @param {String} str 
 * @returns {Result<IRuntimeVersion>}
 */
export function runtime_version_parse(type, str) {

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
        data: new RuntimeVersion(type, ...numbers)
    };

}