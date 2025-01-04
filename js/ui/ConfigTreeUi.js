import { ProjectProperties } from '../preferences/ProjectProperties.js';
import { project_config_tree_get, project_current_get } from '../utils/project.js';

const TreeView = $gmedit['ui.treeview.TreeView'];

/**
 * @type {Record<string, GMEdit.TreeViewDir>}
 */
let configTreeItems = {};

/**
 * @type {GMEdit.TreeViewDir}
 */
let configsTreeDir;

export class ConfigTreeUi {

	static __setup__() {
		GMEdit.on('projectOpen', this.onProjectOpen);
		GMEdit.on('projectClose', this.onProjectClose);
	}

	static __cleanup__() {
		GMEdit.off('projectOpen', this.onProjectOpen);
		GMEdit.off('projectClose', this.onProjectClose);
	}

	/**
	 * Set up tree view build configs.
	 * 
	 * @private
	 */
	static onProjectOpen = () => {

		const project = project_current_get();

		if (project === undefined) {
			return;
		}
		
		const rootConfig = project_config_tree_get(project);
		configsTreeDir = TreeView.makeAssetDir('Build Configs', '', null);
		
		this.addConfigInTree(configsTreeDir.treeItems, rootConfig);
		this.updateConfigTree(ProjectProperties.buildConfig);

		TreeView.element.appendChild(configsTreeDir);
		ProjectProperties.events.on('changeBuildConfig', this.onChangeBuildConfig);

	}

	/**
	 * Clean up the build configs in the tree view.
	 * 
	 * @private
	 */
	static onProjectClose = () => {

		ProjectProperties.events.off('changeBuildConfig', this.onChangeBuildConfig);

		configsTreeDir.remove();
		configTreeItems = {};
		
	}

	/**
	 * @private
	 * @param {{ previous?: string, current: string }} event
	 */
	static onChangeBuildConfig = ({ previous, current }) =>
		this.updateConfigTree(current, previous);

	/**
	 * Add this config recursively to the parent in the tree view.
	 * 
	 * @private
	 * @param {HTMLDivElement} parentElement 
	 * @param {ProjectYYConfig} config 
	 */
	static addConfigInTree(parentElement, config) {

		
		const dir = TreeView.makeDir(config.name);

		dir.treeHeader.title = 'Right-click to select.';
		dir.treeHeader.addEventListener('click', TreeView.handleDirClick);
		dir.treeHeader.addEventListener('contextmenu', () => {
			ProjectProperties.buildConfig = config.name;
		});

		for (const childConfig of config.children) {
			this.addConfigInTree(dir.treeItems, childConfig);
		}

		configTreeItems[config.name] = dir;
		parentElement.appendChild(dir);

	}

	/**
	 * Update the config tree with the new selected config.
	 * 
	 * @private
	 * @param {string} newConfigName 
	 * @param {string} [oldConfigName] 
	 */
	static updateConfigTree(newConfigName, oldConfigName) {

		if (oldConfigName !== undefined) {

			const prevTreeItem = configTreeItems[oldConfigName];

			if (prevTreeItem !== undefined) {

				const headerSpan = prevTreeItem.treeHeader.querySelector('span');

				if (headerSpan !== null) {
					headerSpan.textContent = oldConfigName;
				}

			}
		}

		const treeItem = configTreeItems[newConfigName];

		if (treeItem !== undefined) {
			
			const headerSpan = treeItem.treeHeader.querySelector('span');

			if (headerSpan !== null) {
				headerSpan.textContent = `${newConfigName} (Selected)`;
			}

		}

	}

}
