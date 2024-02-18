
/**
 * Base error type we use to try and be descriptive to the user :)
 * @implements {IErr}
 */
export class Err extends Error {

    /**
     * @param {String} message 
     * @param {Error|null} [cause] 
     * @param {string} [solution] 
     */
    constructor(message, cause = null, solution) {
        super(message, { cause });
        this.solution = solution;
    }

    stackFormat() {

        if (this.cause === null || this.cause === undefined) {
            return `Stack trace:\n${this.stack}`;
        }

        const cause_str = this.cause
            .toString()
            .split('\n')
            .join('\n\t');

        const caused_by_str = `Caused by ${cause_str}\n`;

        return `${caused_by_str}\nStack trace:\n${this.stack}`;
    }

    toString() {
        return `Error:\n${this.message}\n${this.stackFormat()}`;
    }

}