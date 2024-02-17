
const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * Get the currently open project.
 * @returns The current project
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