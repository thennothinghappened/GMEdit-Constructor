
/**
 * @returns {GMLProject|undefined}
 */
export function getCurrentProject() {
    const proj = $gmedit['gml.Project'].current;
    
    if (proj.path === '') {
        return;
    }

    return proj;
}
