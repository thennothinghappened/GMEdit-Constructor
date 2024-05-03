import { Err } from '../Err.js';

/**
 * Representation of a semantic versioning string `major.minor.patch`.
 * 
 * This is used only for the update checker :p
 */
export class SemVer {

    /** @type {number} */
    major;

    /** @type {number} */
    minor;

    /** @type {number} */
    patch;

    /** @type {string?} */
    tag;

    /**
     * @param {number} major The major release version.
     * @param {number} minor The minor release version.
     * @param {number} patch The patch version of the release.
     * @param {string?} [tag] An optional ending tag such as `beta`.
     */
    constructor(major, minor, patch, tag = null) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
        this.tag = tag;
    }

    /**
     * Try to parse a semantic version from the given string.
     * 
     * @param {string} string
     * @returns {Result<SemVer>}
     */
    static parse(string) {

        if (string.startsWith('v')) {
            string = string.slice(1);
        }

        const sections = string.split('.', 3);

        if (sections.length !== 3) {
            return {
                ok: false,
                err: new Err(`Expected three parts separated by dots: "major.minor.patch[-tag]", found "${string}"`)
            };
        }

        let [major_str, minor_str, patch_str] = sections;

        /** @type {string?} */
        let tag = null;
        
        if (patch_str.includes('-')) {
            [patch_str, tag] = patch_str.split('-', 2);
        }

        const [major, minor, patch] = [major_str, minor_str, patch_str].map(str => Number(str));
        
        for (const num of [major, minor, patch]) {

            if (isNaN(num)) {
                return {
                    ok: false,
                    err: new Err(`Version number is non-numerical for given semantic version string "${string}"`)
                };
            }

        }

        return {
            ok: true,
            data: new SemVer(major, minor, patch, tag)
        };

    }

    /**
     * Returns a negative number if this version is older than `other`, 0 for same, or positive for newer.
     * 
     * @param {SemVer} other
     * @returns {number}
     */
    compare(other) {

        const major_diff = this.major - other.major;

        if (major_diff !== 0) {
            return Math.sign(major_diff);
        }

        const minor_diff = this.minor - other.minor;

        if (minor_diff !== 0) {
            return Math.sign(minor_diff);
        }

        const patch_diff = this.patch - other.patch;

        if (patch_diff !== 0) {
            return Math.sign(patch_diff);
        }

        return 0;

    }

    toString() {
        return `${this.major}.${this.minor}.${this.patch}${this.tag !== null ? '-' + this.tag : ''}`;
    }

}
