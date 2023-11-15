
/**
 * Mappings of NodeJS platforms to various Igor information.
 * @type {{[key in NodeJS.Platform]: {ext: string, path_name: string, cmd: string}}}
 */
// @ts-ignore
const igor_platform_map = {
    'win32': {
        ext: '.exe',
        path_name: 'windows',
        cmd: 'Windows'
    },
    'darwin': {
        ext: '',
        path_name: 'osx',
        cmd: 'Mac'
    },
    'linux': {
        ext: '',
        path_name: 'ubuntu', // TODO: can't check this right now
        cmd: 'Linux'
    }
};

/**
 * Default directories as per https://manual-en.yoyogames.com/Settings/Building_via_Command_Line.htm
 * to find runtimes.
 * 
 * Note that this only covers Windows and MacOS, elsewhere will crash trying to index these
 * as I don't know where the location is for Linux.
 * 
 * @type {{[key in NodeJS.Platform]: { stable: string, beta: string }}}
 */
// @ts-ignore
const def_runtime_platform_paths = {
    'win32': {
        stable: 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        beta: 'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes'
    },
    'darwin': {
        stable: '/Users/Shared/GameMakerStudio2/Cache/runtimes',
        beta: '/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes'
    }
};

export const def_runtime_paths = def_runtime_platform_paths[process.platform];

/**
 * Get the local-to-runtime Igor path for the current platform & architecture.
 * @param {import('node:path').join} join_path
 */
export function igorPath(join_path) {
    return join_path('bin', 'igor', igor_platform_map[process.platform].path_name, process.arch, `Igor${igor_platform_map[process.platform].ext}`);
}

/**
 * Igor platform name for our platform.
 */
export const igor_platform_cmd_name = igor_platform_map[process.platform].cmd;