import { GMVersion } from '../compiler/GMVersion.js';
import { BaseError } from './Err.js';
import { Err, Ok } from './Result.js';
import { docString } from './StringUtils.js';

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
 * @returns {GM.YY.BuildConfig}
 */
export function project_config_tree_get(project) {
	return project_read_yy(project).configs;
}

/**
 * Returns the config tree as an array of config names.
 * 
 * @param {GM.YY.BuildConfig} config 
 * @returns {NonEmptyArray<string>}
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
 * @returns {Result<{ supported: true; version: GMVersion } | { supported: false }>}
 */
export function project_format_get(project) {
	
	if (!project.isGMS23) {
		return Ok({ supported: false });
	}

	const yyp = project_read_yy(project);
	const ideVersionStr = yyp.MetaData?.IDEVersion;
	const ideVersionRes = GMVersion.parse(ideVersionStr);
	
	if (!ideVersionRes.ok) {
		return Err(new BaseError(docString(`
				Somehow the IDEVersion field could not be parsed, did YYG change the version naming
				scheme or something??

				Please report this as a Constructor bug!
			`),
			ideVersionRes.err
		));
	}

	return Ok({ supported: true, version: ideVersionRes.data });
	
}

/**
 * Read the YY file of a given project.
 * Code is by YAL's suggestion.
 * 
 * @param {GMEdit.Project} project 
 * @returns {GM.YY.Project}
 */
function project_read_yy(project) {
	// @ts-expect-error Down-casting to a YYP file.
	return project.readYyFileSync(project.name);
}
