import { GMVersion } from '../compiler/GMVersion.js';
import { Err } from './Err.js';

const GmlFile = $gmedit['gml.file.GmlFile'];

/**
 * Get the currently open project.
 * @returns {GMEdit.Project|undefined}
 */
export function project_current_get() {
	
	const proj = $gmedit['gml.Project'].current;
	
	if (proj?.path === '') {
		return;
	}

	return proj ?? undefined;

}

/**
 * @returns Whether any project is currently open.
 */
export function project_is_open() {
	return project_current_get() !== undefined;
}

/**
 * Saves all unsaved open files in the editor.
 */
export function open_files_save() {
	const tabs = $gmedit['ui.ChromeTabs'].getTabs();

	tabs.forEach(editor => {
		if (editor.gmlFile.__changed) {
			editor.gmlFile.save();
		}
	});
}

/**
 * Get the currently chosen open tab.
 * @returns {GMEdit.ChromeTab|undefined}
 */
export function tab_current_get() {
	return GmlFile.current?.tabEl ?? undefined;
}

/**
 * Get the config tree for a project.
 * 
 * @param {GMEdit.Project} project 
 * @returns {ProjectYYConfig}
 */
export function project_config_tree_get(project) {
	return project_read_yy(project).configs;
}

/**
 * Returns the config tree as an array of config names.
 * 
 * @param {ProjectYYConfig} config 
 * @returns {string[]}
 */
export function project_config_tree_flatten(config) {
	return [
		config.name, 
		...config.children.flatMap(child => project_config_tree_flatten(child))
	];
}

/**
 * Returns what kind of project YY format we're running.
 * 
 * @param {GMEdit.Project} project 
 * @returns {Result<YYProjectFormat>}
 */
export function project_format_get(project) {
	
	if (!project.isGMS23) {
		return { ok: true, data: '[Unsupported]' };
	}

	if (!project.isGM2024) {
		return { ok: true, data: '2023.11' };
	}

	const yyp = project_read_yy(project);
	const ideVersionStr = yyp.MetaData?.IDEVersion;
	const ideVersionRes = GMVersion.parse(ideVersionStr);
	
	if (!ideVersionRes.ok) {
		return {
			ok: false,
			err: new Err(
				'Somehow the IDEVersion field could not be parsed, did YYG change the version naming scheme or something?? Please report this as a Constructor bug!',
				ideVersionRes.err
			)
		};
	}

	return {
		ok: true,
		data: ide_get_format(ideVersionRes.data)
	};
	
}

/**
 * @param {GMVersion} ideVersion 
 * @returns {YYProjectFormat}
 */
function ide_get_format(ideVersion) {

	// All 2023 or lower are YYv1.
	if (ideVersion.year < 2024) {
		return '2023.11';
	}

	if (ideVersion.year === 2024) {

		if (ideVersion.month === 200) {

			// TODO: IDE version was different to the runtime version when this change happened.
			// YYG have removed the relevant release notes page so this will require digging on
			// GitHub.
			if (ideVersion.build < 490) {
				return '2023.11';
			} else {
				return '2024.2';
			}

		}

		// 2024.2 is incompatible with 2024.4+.
		if (ideVersion.month === 2) {
			return '2024.2';
		}

		// 2024.4 is incompatible with 2024.6+.
		if (ideVersion.month === 4 || ideVersion.month === 400) {
			return '2024.4';
		}

		// 2024.6 is incompatible with 2024.8+.
		if (ideVersion.month === 6 || ideVersion.month === 600) {
			return '2024.6';
		}

		// 2024.8 is incompatible with 2024.11+.
		if (ideVersion.month === 8 || ideVersion.month === 800) {
			return '2024.8';
		}
		
	}

	return '2024.11+';

}

/**
 * Read the YY file of a given project.
 * Code is by YAL's suggestion.
 * 
 * @param {GMEdit.Project} project 
 * @returns {ProjectYY}
 */
function project_read_yy(project) {
	return project.readYyFileSync(project.name);
}
