
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

}