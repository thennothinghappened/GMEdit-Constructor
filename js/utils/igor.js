
/**
 * Mappings of NodeJS platforms to various Igor information.
 * @type {{[key in NodeJS.Platform]: {ext: string, path_name: string, cmd: string}}}
 */

import { Err } from './Err.js';

// @ts-ignore
const igor_platform_map = {
    'win32': {
        ext: '.exe',
        path_name: 'windows',
        cmd: 'Windows'
    },
    'darwin': {
        ext: '',
        path_name: 'osx',
        cmd: 'Mac'
    },
    'linux': {
        ext: '',
        path_name: 'ubuntu', // TODO: can't check this right now
        cmd: 'Linux'
    }
};

/**
 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
 * to find runtimes.
 * 
 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
 * as I don't know where the location is for Linux.
 * 
 * @type {{[key in NodeJS.Platform]: { [key in RuntimeType]: string }}}
 */
// @ts-ignore
const def_runtime_platform_paths = {
    'win32': {
        Stable: 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        Beta: 'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes',
        LTS: 'C:\\ProgramData\\GameMakerStudio2-LTS\\Cache\\runtimes'
    },
    'darwin': {
        Stable: '/Users/Shared/GameMakerStudio2/Cache/runtimes',
        Beta: '/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes',
        LTS: '/Users/Shared/GameMakerStudio2-LTS/Cache/runtimes'
    }
};

export const def_runtime_paths = def_runtime_platform_paths[process.platform];

/**
 * Get the local-to-runtime Igor path for the current platform & architecture.
 * @param {import('node:path').join} join_path
 */
export function igorPath(join_path) {
    return join_path('bin', 'igor', igor_platform_map[process.platform].path_name, process.arch, `Igor${igor_platform_map[process.platform].ext}`);
}

/**
 * Igor platform name for our platform.
 */
export const igor_platform_cmd_name = igor_platform_map[process.platform].cmd;

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