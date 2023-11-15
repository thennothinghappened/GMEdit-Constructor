
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
export function UIDropdownMutate(root, opts, value) {

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

/**
 * Promise version of `Electron_FS.exists`.
 * @param {string} path 
 * @returns {Promise<boolean>}
 */
export function fileExists(path) {
    return new Promise(res => {
        Electron_FS.exists(path, exists => {
            res(exists);
        })
    });
}

/**
 * Promise version of `Electron_FS.readFile`.
 * @param {string} path 
 * @returns {Promise<Result<string, Error>>}
 */
export function readFile(path) {
    return new Promise(res => {
        Electron_FS.readFile(path, (err, data) => {
            if (err !== null) {
                res({ err, msg: 'Failed to read file.' });
            }

            // @ts-ignore
            res({ data });
        })
    });
}

/**
 * Promise version of `Electron_FS.readdir`.
 * @param {string} path 
 * @returns {Promise<Result<string[], Error>>}
 */
export function readdir(path) {
    return new Promise(res => {
        Electron_FS.readdir(path, (err, data) => {
            if (err !== null) {
                res({ err, msg: 'Failed to read directory.' });
            }

            // @ts-ignore
            res({ data });
        })
    });
}

/**
 * Promise version of `Electron_FS.writeFile`.
 * @param {string} path 
 * @param {string} data
 * @returns {Promise<Result<void, Error>>}
 */
export function writeFile(path, data) {
    return new Promise(res => {
        Electron_FS.writeFile(path, data, (err) => {
            if (err !== null) {
                res({ err, msg: 'Failed to write file.' });
            }

            // @ts-ignore
            res({ data: null });
        })
    });
}