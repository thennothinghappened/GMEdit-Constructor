
/**
 * Mappings of NodeJS platforms to various Igor information.
 * @type {{[key in NodeJS.Platform]: {ext: string, path_name: string, cmd: string}}}
 */

import { join_path } from '../GMConstructor.js';
import { Err } from '../utils/Err.js';

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
 * @type {{[key in NodeJS.Platform]: { [key in RuntimeType]: string }}}
 */
// @ts-ignore
const def_runtime_platform_paths = {
    'win32': {
        Stable: 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        Beta: 'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes',
        LTS: 'C:\\ProgramData\\GameMakerStudio2-LTS\\Cache\\runtimes'
    },
    'darwin': {
        Stable: '/Users/Shared/GameMakerStudio2/Cache/runtimes',
        Beta: '/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes',
        LTS: '/Users/Shared/GameMakerStudio2-LTS/Cache/runtimes'
    }
};

export const def_runtime_paths = def_runtime_platform_paths[process.platform];

/**
 * The local-to-runtime Igor path for the current platform & architecture.
 * @type {string}
 */
export let igor_path_segment;

/**
 * Igor platform name for our platform.
 */
export const igor_platform_cmd_name = igor_platform_map[process.platform].cmd;

/**
 * Called when the plugin is loading.
 */
export function __setup__() {
    igor_path_segment = join_path('bin', 'igor', igor_platform_map[process.platform].path_name, process.arch, `Igor${igor_platform_map[process.platform].ext}`);
}