
const GmlFile = $gmedit['gml.file.GmlFile'];
const ChromeTabs = $gmedit['ui.ChromeTabs'];

/**
 * Get the currently open project.
 * @returns The current project
 */
export function getCurrentProject() {
    const proj = $gmedit['gml.Project'].current;
    
    if (proj?.path === '') {
        return;
    }

    return proj;
}

/**
 * @returns Whether any project is currently open.
 */
export function isProjectOpen() {
    return getCurrentProject() !== undefined;
}

/**
 * Saves all unsaved open files in the editor.
 */
export function saveOpenFiles() {
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
export function getCurrentTab() {
    
    const tabs = ChromeTabs.getTabs();
    const current_file = GmlFile.current;

    

}