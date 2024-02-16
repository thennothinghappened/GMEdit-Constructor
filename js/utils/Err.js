
/**
 * Base error type we use to try and be descriptive to the user :)
 */
export class Err extends Error {

    /**
     * @param {String} message 
     * @param {Error|null} [cause] 
     */
    constructor(message, cause = null) {
        super(message, { cause });
    }

    toString() {

        let caused_by_str = '';

        if (this.cause !== null && this.cause !== undefined) {

            const cause_str = this.cause
                .toString()
                .split('\n')
                .join('\n\t');

            caused_by_str = `\nCaused by ${cause_str}\n`;

        }

        return `Error:\n${this.message}\n${caused_by_str}\nStack trace:\n${this.stack}`;
    }

}