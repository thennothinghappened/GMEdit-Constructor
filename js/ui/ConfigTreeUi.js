import { GMConstructor } from '../GMConstructor.js';
import { ProjectProperties } from '../preferences/ProjectProperties.js';
import { project_config_tree_get, project_current_get } from '../utils/project.js';

const TreeView = $gmedit['ui.treeview.TreeView'];
/**
 * Sidebar folder that visually shows the project build configs to select from more easily than via
 * the control panel.
 */
export class ConfigTreeUi {

	/**
	 * @private
	 * @type {ProjectProperties}
	 */
	projectProperties;

	/**
	 * @private
	 * @type {Record<string, GMEdit.TreeViewDir>}
	 */
	configTreeItems = {};

	/**
	 * @private
	 * @type {GMEdit.TreeViewDir}
	 */
	configsTreeDir;

	/**
	 * @private
	 * @type {Map<GMEdit.Project, ConfigTreeUi>}
	 */
	static instances = new Map();

	/**
	 * @private
	 * @param {GMEdit.Project} project 
	 * @param {ProjectProperties} projectProperties 
	 */
	constructor(project, projectProperties) {

		this.projectProperties = projectProperties;

		const rootConfig = project_config_tree_get(project);
		this.configsTreeDir = TreeView.makeAssetDir('Build Configs', '', null);
		
		this.addConfigInTree(this.configsTreeDir.treeItems, rootConfig);
		this.updateConfigTree(this.projectProperties.buildConfigName);

		TreeView.element.appendChild(this.configsTreeDir);
		this.projectProperties.events.on('setBuildConfig', this.onChangeBuildConfig);

	}

	/**
	 * @private
	 */
	destroy() {
		this.projectProperties.events.off('setBuildConfig', this.onChangeBuildConfig);
		this.configsTreeDir?.remove();
	}

	static __setup__() {
		GMEdit.on('projectOpen', this.onProjectOpen);
		GMEdit.on('projectClose', this.onProjectClose);
	}

	static __cleanup__() {
		
		GMEdit.off('projectOpen', this.onProjectOpen);
		GMEdit.off('projectClose', this.onProjectClose);
		
		for (const instance of this.instances.values()) {
			instance.destroy();
		}

		this.instances.clear();

	}

	/**
	 * Set up tree view build configs.
	 * 
	 * @param {GMEdit.PluginEventMap['projectOpen']} event
	 * @private
	 */
	static onProjectOpen = ({ project }) => {

		const properties = ProjectProperties.get(project);

		if (properties.ok) {
			this.instances.set(project, new ConfigTreeUi(project, properties.data));
		}

	}

	/**
	 * Clean up the build configs in the tree view.
	 * 
	 * @param {GMEdit.PluginEventMap['projectClose']} event
	 * @private
	 */
	static onProjectClose = ({ project }) => {

		const instance = this.instances.get(project);

		if (instance !== undefined) {
			instance.destroy();
			this.instances.delete(project);
		}
		
	}

	/**
	 * @private
	 * @param {{ previous?: string, current: string }} event
	 */
	onChangeBuildConfig = ({ previous, current }) =>
		this.updateConfigTree(current, previous);

	/**
	 * Add this config recursively to the parent in the tree view.
	 * 
	 * @private
	 * @param {HTMLDivElement} parentElement 
	 * @param {ProjectYYConfig} config 
	 */
	addConfigInTree(parentElement, config) {

		const dir = TreeView.makeDir(config.name);

		dir.treeHeader.title = 'Right-click to select.';
		dir.treeHeader.addEventListener('click', TreeView.handleDirClick);
		dir.treeHeader.addEventListener('contextmenu', () => {
			this.projectProperties.buildConfigName = config.name;
		});

		for (const childConfig of config.children) {
			this.addConfigInTree(dir.treeItems, childConfig);
		}

		this.configTreeItems[config.name] = dir;
		parentElement.appendChild(dir);

	}

	/**
	 * Update the config tree with the new selected config.
	 * 
	 * @private
	 * @param {string} newConfigName 
	 * @param {string} [oldConfigName] 
	 */
	updateConfigTree(newConfigName, oldConfigName) {

		if (oldConfigName !== undefined) {

			const prevTreeItem = this.configTreeItems[oldConfigName];

			if (prevTreeItem !== undefined) {

				const headerSpan = prevTreeItem.treeHeader.querySelector('span');

				if (headerSpan !== null) {
					headerSpan.textContent = oldConfigName;
				}

			}
		}

		const treeItem = this.configTreeItems[newConfigName];

		if (treeItem !== undefined) {
			
			const headerSpan = treeItem.treeHeader.querySelector('span');

			if (headerSpan !== null) {
				headerSpan.textContent = `${newConfigName} (Selected)`;
			}

		}

	}

}
