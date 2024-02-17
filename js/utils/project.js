
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
 * @returns {GMLProjectConfig}
 */
export function project_get_config_tree(project) {
    return project_read_yy(project).configs;
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
    return project.readYyFileSync(project.name)
}