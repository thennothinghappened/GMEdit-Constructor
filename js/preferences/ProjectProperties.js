/**
 * Handler for project-specific preferences.
 */

import { project_current_get } from '../utils/project.js';

export function __setup__() {

    GMEdit.on('projectPropertiesBuilt', on_project_open);

}

export function __cleanup__() {

    GMEdit.off('projectPropertiesBuilt', on_project_open);

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

    console.log(project.properties);

}