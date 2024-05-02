
/**
 * Mutate a dropdown menu with new elements to change them on the fly.
 * TODO: this makes a lot of garbage, ideally reuse some elements if possible.
 * 
 * @param {HTMLElement} root Root element of the dropdown.
 * @param {string[]} opts New options for the dropdown.
 * @param {string} [value]
 */
export function UIDropdownMutate(root, opts, value) {

    /** @type {HTMLSelectElement} */
    // @ts-ignore
    const sel = root.querySelector('select');

    const oldValue = sel.value;

    for (const el of Array.from(sel.childNodes)) {
        sel.removeChild(el);
    }

    for (const opt of opts) {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;

        sel.appendChild(el);
    }

    if (opts.includes(oldValue)) {
        sel.value = oldValue;
    } else {
        sel.value = value ?? opts[0] ?? '';
    }
}