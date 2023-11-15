
/**
 * Get the currently open project.
 * @returns The current project
 */
export function getCurrentProject() {
    const proj = $gmedit['gml.Project'].current;
    
    if (proj?.path === '') {
        return;
    }

    return proj;
}

/**
 * @returns Whether any project is currently open.
 */
export function isProjectOpen() {
    return getCurrentProject() !== undefined;
}

/**
 * Mutate a dropdown menu with new elements to change them on the fly.
 * TODO: this makes a lot of garbage, ideally reuse some elements if possible.
 * 
 * @param {HTMLElement} root Root element of the dropdown.
 * @param {string[]} opts New options for the dropdown.
 * @param {string} [value]
 */
export function uiDropdownMutate(root, opts, value) {

    /** @type {HTMLSelectElement} */
    // @ts-ignore
    const sel = root.querySelector('select');

    for (const el of Array.from(sel.childNodes)) {
        sel.removeChild(el);
    }

    for (const opt of opts) {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;

        sel.appendChild(el);
    }

    if (value === undefined && opts.includes(sel.value)) {
        sel.value = '';
    }
}