import { Err } from './Err.js';

const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * Get the currently open project.
 * @returns {GMLProject|undefined}
 */
export function project_current_get() {
    const proj = $gmedit['gml.Project'].current;
    
    if (proj?.path === '') {
        return;
    }

    return proj;
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
 */
export function tab_current_get() {
    
    const tabs = ChromeTabs.getTabs();
    const current_file = GmlFile.current;

    

}

/**
 * Get the config tree for a project.
 * @param {GMLProject} project 
 * @returns {GMLProjectYYConfig}
 */
export function project_config_tree_get(project) {
    return project_read_yy(project).configs;
}

/**
 * Returns the config tree as an array of config names.
 * @param {GMLProjectYYConfig} config 
 * @returns {string[]}
 */
export function project_config_tree_to_array(config) {

    const arr = config.children.flatMap(child => project_config_tree_to_array(child));
    arr.push(config.name);

    return arr.reverse();

}

/**
 * Returns what kind of project YY format we're running.
 * @param {GMLProject} project 
 * @returns {Result<YYProjectFormat>}
 */
export function project_format_get(project) {
    
    if (!project.isGMS23) {
        return {
            ok: true,
            data: 'outdated'
        };
    }

    const yy = project_read_yy(project);
    
    if (yy.resourceVersion === '2.0') {
        return {
            ok: true,
            data: 'YYv2'
        };
    }

    if (yy.resourceVersion === '1.0') {
        return {
            ok: true,
            data: 'YYv1'
        };
    }

    return {
        ok: false,
        err: new Err(
            `Unknown project YY version '${yy.resourceVersion}'`,
            'Expected 1.0 or 2.0',
            'Is this a GM(:S 2) game? Is this plugin up to date?'
        )
    };
}

/**
 * Read the YY file of a given project.
 * Code is by YAL's suggestion.
 * 
 * @param {GMLProject} project 
 * @returns {GMLProjectYY}
 */
function project_read_yy(project) {
    // @ts-ignore
    return project.readYyFileSync(project.name);
}