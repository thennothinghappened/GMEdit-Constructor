/**
 * Handler for project-specific preferences.
 */

import { Err } from '../utils/Err.js';
import { project_current_get, project_config_tree_get } from '../utils/project.js';
import * as preferences from './Preferences.js';
const ProjectProperties = $gmedit['ui.project.ProjectProperties'];

/**
 * The current properties instance.
 * @type {Partial<ProjectPreferencesData>}
 */
let properties = {};

export function __setup__() {

    GMEdit.on('projectOpen', on_project_open);

}

export function __cleanup__() {

    GMEdit.off('projectOpen', on_project_open);

}

/**
 * Get the active compile config name.
 * @returns {string}
 */
export function config_name_get() {
    return properties.config_name ?? 'Default';
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
 * Get the desired runner type.
 * @returns {RunnerType}
 */
export function runner_get() {
    return properties.runner ?? preferences.runner_get();
}

/**
 * Get the desired runner type for this project (without falling back to the global option).
 * @returns {RunnerType|undefined}
 */
export function runner_project_get() {
    return properties.runner;
}

/**
 * Set the desired runtime channel type.
 * @param {RunnerType|undefined} runner 
 */
export function runner_set(runner) {

    properties.runner = runner;
    return save();

}

/**
 * Get the desired runtime channel type.
 * @returns {RuntimeChannelType}
 */
export function runtime_channel_type_get() {
    return properties.runtime_type ?? preferences.runtime_channel_type_get();
}

/**
 * Get the desired runtime channel type for this project (without falling back to the global option).
 * @returns {RuntimeChannelType|undefined}
 */
export function runtime_project_channel_type_get() {
    return properties.runtime_type;
}

/**
 * Set the desired runtime channel type.
 * @param {RuntimeChannelType|undefined} runtime_type 
 */
export function runtime_channel_type_set(runtime_type) {

    properties.runtime_type = runtime_type;
    return save();

}

/**
 * Get the desired runtime version for this project.
 * @returns {string|null}
 */
export function runtime_version_get() {
    return properties.runtime_version ?? preferences.runtime_version_get(runtime_project_channel_type_get());
}

/**
 * Get the desired runtime channel type for this project (without falling back to the global option).
 * @returns {string|undefined}
 */
export function runtime_project_version_get() {
    return properties.runtime_version;
}

/**
 * Set the desired runtime channel type.
 * @param {string|undefined} runtime_type 
 */
export function runtime_version_set(runtime_type) {

    properties.runtime_version = runtime_type;
    return save();

}

/**
 * Get the runtime version to use for the current project.
 * @returns {Result<RuntimeInfo>}
 */
export function runtime_get() {

    const type = runtime_channel_type_get();
    const desired_runtime_list = preferences.runtime_versions_get_for_type(type);

    if (desired_runtime_list === null) {
        return {
            ok: false,
            err: new Err(`Runtime type ${type} list not loaded!`)
        };
    }

    const version = runtime_version_get() ?? desired_runtime_list[0]?.version?.toString();
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

 * Get the user to use for the current project.
 * @returns {Result<UserInfo>}
 */
export function user_get() {

    const type = runtime_channel_type_get();
    const desired_user_list = preferences.users_get_for_type(type);

    if (desired_user_list === null) {
        return {
            ok: false,
            err: new Err(`Users for runtime ${type} list not loaded!`)
        };
    }

    const name = preferences.user_get(type) ?? desired_user_list[0]?.name?.toString();
    const user = desired_user_list.find(user => user.name.toString() === name);

    if (user === undefined) {
        return {
            ok: false,
            err: new Err(`Failed to find any users for runtime ${type}`)
        };
    }

    return {
        ok: true,
        data: user
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

    properties = {};

    const saved = project.properties['GMEdit-Constructor'];
    
    if (saved !== undefined && saved !== null) {
        Object.assign(properties, saved);
    }

}
