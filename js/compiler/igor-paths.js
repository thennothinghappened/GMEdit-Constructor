
import { join_path } from '../GMConstructor.js';

const windowsAppdata = process.env?.AppData ?? 'C:\\Users\\PLEASE_SPECIFY_USERNAME\\AppData\\Roaming';

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
			Stable:	'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
			Beta:	'C:\\ProgramData\\GameMakerStudio2-Beta\\Cache\\runtimes',
			LTS:	'C:\\ProgramData\\GameMakerStudio2-LTS\\Cache\\runtimes'
		},
		default_user_paths: {
			Stable:	windowsAppdata + '\\GameMakerStudio2',
			Beta:	windowsAppdata + '\\GameMakerStudio2-Beta',
			LTS:	windowsAppdata + '\\GameMakerStudio2-LTS'
		},
		default_global_build_path: windowsAppdata + '\\GMEdit-Constructor\\builds'
	},
	'darwin': {
		platform_executable_extension: '',
		platform_path_name: 'osx',
		user_platform: 'Mac',
		default_runtime_paths: {
			Stable:	'/Users/Shared/GameMakerStudio2/Cache/runtimes',
			Beta:	'/Users/Shared/GameMakerStudio2-Beta/Cache/runtimes',
			LTS:	'/Users/Shared/GameMakerStudio2-LTS/Cache/runtimes'
		},
		default_user_paths: {
			Stable:	process.env.HOME + '/.config/GameMakerStudio2',
			Beta:	process.env.HOME + '/.config/GameMakerStudio2-Beta',
			LTS:	process.env.HOME + '/.config/GameMakerStudio2-LTS'
		},
		default_global_build_path: process.env.HOME + '/GMEdit-Constructor/builds'
	},
	'linux': {
		platform_executable_extension: '',
		platform_path_name: 'linux',
		user_platform: 'Linux',
		default_runtime_paths: {
			Stable:	process.env.HOME + '/.local/share/GameMakerStudio2/Cache/runtimes',
			Beta:	process.env.HOME + '/.local/share/GameMakerStudio2-Beta/Cache/runtimes',
			LTS:	process.env.HOME + '/.local/share/GameMakerStudio2-LTS/Cache/runtimes'
		},
		default_user_paths: {
			Stable:	process.env.HOME + '/.config/GameMakerStudio2',
			Beta:	process.env.HOME + '/.config/GameMakerStudio2-Beta',
			LTS:	process.env.HOME + '/.config/GameMakerStudio2-LTS'
		},
		default_global_build_path: process.env.HOME + '/GMEdit-Constructor/builds'
	}
};

/**
 * Mappings of Igor targets to output file extensions. TODO: other targets
 * @type {{[K in IgorPlatform]?: string}}
*/
export const output_package_exts = {
	Windows: '.zip',
	Mac: '.zip',
	Linux: '.appimage',
};

/**
 * Mappings of Igor targets to respective file extensions for output data blobs. TODO: other targets
 * @type {{[K in IgorPlatform]?: string}}
*/
export const output_blob_exts = {
	Windows: '.win',
	Mac: '.ios',
	Linux: '.unx',
};

/**
 * Default paths to the runtimes for the host OS.
 */
export const def_runtime_paths = igor_platform_map[process.platform].default_runtime_paths;

/**
 * Default paths to the userdata folders for the host OS.
 */
export const def_user_paths = igor_platform_map[process.platform].default_user_paths;

/**
 * Default path to the global build directory.
 */
export const def_global_build_path = igor_platform_map[process.platform].default_global_build_path;


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
