import { Err } from '../utils/Err.js';
import { project_format_get } from '../utils/project.js';

/**
 * @implements {IRuntimeVersion}
 */
export class RuntimeVersion {

    /**
     * @param {GMChannelType} type 
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
     * @returns {YYProjectFormat}
     */
    get format() {
        if (this.year < 2024) {
            return 'YYv1';
        }

        if (this.year > 2024 || this.month !== 200) {
            return 'YYv2';
        }

        if (this.build <= 490) {
            return 'YYv2';
        }

        return 'YYv1';
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
     * 
     * @returns {Result<void>}
     */
    supported() {

        return {
            ok: true,
            data: undefined
        };

    }

    /**
     * Returns whether this runtime version is supported by a given project.
     * 
     * Projects on 2023.11 and earlier use a different format to 2024.2 and greater
     * as per [Prefabs Phase 1](https://github.com/YoYoGames/GameMaker-Bugs/issues/3218).
     * 
     * @param {GMLProject} project 
     * @returns {Result<boolean>}
     */
    supportedByProject(project) {

        const project_format_res = project_format_get(project);

        if (!project_format_res.ok) {
            return {
                ok: false,
                err: new Err(
                    `Failed to get project format version to check support for project '${project.displayName}'`,
                    project_format_res.err
                )
            };
        }

        const project_format = project_format_res.data;

        return {
            ok: true,
            data: (project_format === this.format)
        };

    }

    toString() {
        return `runtime-${this.year}.${this.month}.${this.major}.${this.build}`;
    }

}

/**
 * Attempt to parse a runtime version from a string.
 * @param {GMChannelType} type
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