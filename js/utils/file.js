
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