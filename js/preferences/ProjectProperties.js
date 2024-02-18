/**
 * Handler for project-specific preferences.
 */

import { Err } from '../utils/Err.js';
import { project_current_get, project_config_tree_get } from '../utils/project.js';
import * as preferences from './Preferences.js';
const ProjectProperties = $gmedit['ui.project.ProjectProperties'];

/** @type {Readonly<ProjectPreferencesData>} */
const properties_default = {

    config_name: 'Default',

    get runtime_type() {
        return preferences.runtime_channel_type_get();
    },
    
    get runtime_version() {
        return preferences.runtime_version_get();
    }
    
};

/**
 * The current properties instance.
 * @type {ProjectPreferencesData}
 */
let properties = Object.create(properties_default);

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
    return save();
}

/**
 * Get the desired runtime channel type.
 * @returns {RuntimeChannelType}
 */
export function runtime_channel_type_get() {
    return properties.runtime_type;
}

/**
 * Set the desired runtime channel type.
 * @param {RuntimeChannelType|null} runtime_type 
 */
export function runtime_channel_type_set(runtime_type) {
    
    if (runtime_type === null) {
        // @ts-ignore
        delete properties.runtime_type;
        return save();
    }

    properties.runtime_type = runtime_type;
    return save();
}

/**
 * Get the runtime to use for the current project.
 * @returns {Result<RuntimeInfo>}
 */
export function runtime_get() {

    const type = properties.runtime_type;
    const desired_runtime_list = preferences.runtime_versions_get_for_type(type);

    if (desired_runtime_list === null) {
        return {
            ok: false,
            err: new Err(`Runtime type ${type} list not loaded!`)
        };
    }

    const version = preferences.runtime_version_get(type) ?? desired_runtime_list[0]?.version?.toString();
    const runtime = desired_runtime_list.find(runtime => runtime.version.toString() === version);

    if (runtime === undefined) {
        return {
            ok: false,
            err: new Err(`Failed to find any runtimes of type ${type}`)
        };
    }

    return {
        ok: true,
        data: runtime
    };
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
