
export function getCurrentProject() {
    const proj = $gmedit['gml.Project'].current;
    
    if (proj?.path === '') {
        return;
    }

    return proj;
}

export function isProjectOpen() {
    return getCurrentProject() !== undefined;
}
