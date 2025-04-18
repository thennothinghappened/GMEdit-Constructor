
import * as node from '../utils/node/node-import.js';

const windowsAppData = process.env?.AppData ?? 'C:\\Users\\PLEASE_SPECIFY_USERNAME\\AppData\\Roaming';
const windowsLocalAppData = process.env?.LocalAppData ?? 'C:\\Users\\PLEASE_SPECIFY_USERNAME\\AppData\\Local';
const linuxConfigPath = process.env.XDG_CONFIG_HOME ?? process.env.HOME + '/.config';
const linuxDataPath = process.env.XDG_DATA_HOME ?? process.env.HOME + '/.local/share';

/**
 * Mappings of NodeJS platforms to various Igor information.
 * @type {{[key in NodeJS.Platform]: GMS2.IgorPlatformInfo}}
 */
// @ts-expect-error We don't care that unsupported platforms are missing, GMEdit doesn't even run there.
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
			Stable:	windowsAppData + '\\GameMakerStudio2',
			Beta:	windowsAppData + '\\GameMakerStudio2-Beta',
			LTS:	windowsAppData + '\\GameMakerStudio2-LTS'
		},
		default_global_build_path: windowsLocalAppData + '\\GMEdit-Constructor\\builds'
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
			Stable:	linuxDataPath + '/GameMakerStudio2/Cache/runtimes',
			Beta:	linuxDataPath + '/GameMakerStudio2-Beta/Cache/runtimes',
			LTS:	linuxDataPath + '/GameMakerStudio2-LTS/Cache/runtimes'
		},
		default_user_paths: {
			Stable:	linuxConfigPath + '/GameMakerStudio2',
			Beta:	linuxConfigPath + '/GameMakerStudio2-Beta',
			LTS:	linuxConfigPath + '/GameMakerStudio2-LTS'
		},
		default_global_build_path: linuxDataPath + '/GMEdit-Constructor/builds'
	}
};

/**
 * Mappings of Igor targets to output file extensions. TODO: other targets
 * @type {{[K in GMS2.Platform]?: string}}
*/
export const output_package_exts = {
	Windows: '.zip',
	Mac: '.zip',
	Linux: '.appimage',
};

/**
 * Mappings of Igor targets to respective file extensions for output data blobs. TODO: other targets
 * @type {{[K in GMS2.Platform]?: string}}
*/
export const output_blob_exts = {
	Windows: 'win',
	Mac: 'ios',
	Linux: 'unx',
	HTML5: 'zip',
	OperaGX: 'unx'
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
 * Called when the plugin is loading.
 */
export function __setup__() {
	igor_path_segment = node.path.join(
		'bin',
		'igor',
		igor_platform_map[process.platform].platform_path_name,
		process.arch,
		`Igor${igor_platform_map[process.platform].platform_executable_extension}`
	);
}
