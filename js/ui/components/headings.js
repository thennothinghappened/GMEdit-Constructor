
/**
 * Create a h1.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h1(text) {
    return heading(1, text);
}

/**
 * Create a h2.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h2(text) {
    return heading(2, text);
}

/**
 * Create a h3.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h3(text) {
    return heading(3, text);
}

/**
 * Create a h4.
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
export function h4(text) {
    return heading(4, text);
}

/**
 * Create a heading of a given size.
 * @param {number} size 
 * @param {string} text 
 * @returns {HTMLHeadingElement}
 */
function heading(size, text) {

    const heading = document.createElement(`h${size}`);
    heading.textContent = text;

    // @ts-ignore
    return heading;

}