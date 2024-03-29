
import { join_path } from '../GMConstructor.js';
import { Err } from '../utils/Err.js';

/**
 * Mappings of NodeJS platforms to various Igor information.
 * @type {{[key in NodeJS.Platform]: IgorPlatformInfo}}
 */
const igor_platform_map = {
    'win32': {
        platform_executable_extension: '.exe',
        platform_path_name: 'windows',
        user_platform: 'Windows',
        default_runtime_paths: {
            Stable: 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
            Beta:   'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes',
            LTS:    'C:\\ProgramData\\GameMakerStudio2-LTS\\Cache\\runtimes'
        }
    },
    'darwin': {
        platform_executable_extension: '',
        platform_path_name: 'osx',
        user_platform: 'Mac',
        default_runtime_paths: {
            Stable: '/Users/Shared/GameMakerStudio2/Cache/runtimes',
            Beta:   '/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes',
            LTS:    '/Users/Shared/GameMakerStudio2-LTS/Cache/runtimes'
        }
    },
    'linux': {
        platform_executable_extension: '',
        platform_path_name: 'ubuntu', // TODO: can't check this right now
        user_platform: 'Linux',
        default_runtime_paths: {
            Stable: '/please/specify/your/runtime/paths',
            Beta:   '/please/specify/your/runtime/paths',
            LTS:    '/please/specify/your/runtime/paths'
        }
    }
};

/**
 * Default paths to the runtimes for the host OS.
 */
export const def_runtime_paths = igor_platform_map[process.platform].default_runtime_paths;

/**
 * {@link IgorPlatform} to native build for the host OS. 
 */
export const igor_user_platform = igor_platform_map[process.platform].user_platform;

/**
 * The local-to-runtime Igor path for the current platform & architecture.
 * @type {string}
 */
export let igor_path_segment;

/**
 * Igor platform name for our platform.
 */
export const igor_platform_cmd_name = igor_platform_map[process.platform].user_platform;

/**
 * Called when the plugin is loading.
 */
export function __setup__() {
    igor_path_segment = join_path('bin', 'igor', igor_platform_map[process.platform].platform_path_name, process.arch, `Igor${igor_platform_map[process.platform].platform_executable_extension}`);
}