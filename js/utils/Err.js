
/**
 * Base error type we use to try and be descriptive to the user :)
 * @implements {IErr}
 */
export class Err extends Error {

    /**
     * @param {string} message 
     * @param {any?} [cause] 
     * @param {string} [solution] 
     * @param {string} [title]
     */
    constructor(message, cause = null, solution, title) {
        super(message, { cause });
        this.title = title;
        this.solution = solution;
    }

    stackFormat() {

        if (this.cause === null || this.cause === undefined) {
            return `Stack trace:\n${this.stack}`;
        }

        const cause_str = this.cause
            .toString()
            .split('\n')
            .join('\n    ');

        const caused_by_str = `Caused by ${cause_str}\n`;

        return `${caused_by_str}\nStack trace:\n${this.stack}`;
    }

    toString() {
        return `${this.title ?? 'Error'}: \n${this.message}\n${this.stackFormat()}`;
    }

}
