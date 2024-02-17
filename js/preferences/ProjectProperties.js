/**
 * Handler for project-specific preferences.
 */

import { project_current_get, project_config_tree_get } from '../utils/project.js';
const ProjectProperties = $gmedit['ui.project.ProjectProperties'];

/** @type {ProjectPreferencesData} */
const properties_default = {

    config_name: 'Default'
    
};

/**
 * The current properties instance.
 * @type {ProjectPreferencesData}
 */
let properties;

export function __setup__() {

    GMEdit.on('projectOpen', on_project_open);

}

export function __cleanup__() {

    GMEdit.off('projectOpen', on_project_open);

}

/**
 * Get the active compile config name.
 */
export function config_name_get() {
    return properties.config_name;
}

/**
 * Set the active compile config name.
 * @param {string} config_name 
 */
export function config_name_set(config_name) {
    properties.config_name = config_name;
    save();
}

/**
 * Save the project properties.
 */
function save() {

    const project = project_current_get();

    if (project === undefined) {
        return;
    }

    project.properties['GMEdit-Constructor'] = properties;
    ProjectProperties.save(project, project.properties);

}

/**
 * Make sure the project's properties contain Constructor's
 * data.
 */
function on_project_open() {

    const project = project_current_get();

    if (project === undefined) {
        return;
    }

    properties = Object.create(properties_default);

    const saved = project.properties['GMEdit-Constructor'];
    
    if (saved !== undefined && saved !== null) {
        Object.assign(properties, saved);
    }

}
