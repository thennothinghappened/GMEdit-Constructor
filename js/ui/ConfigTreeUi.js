import { ProjectProperties } from '../preferences/ProjectProperties.js';

const TreeView = $gmedit['ui.treeview.TreeView'];

/**
 * Sidebar folder that visually shows the project build configs to select from more easily than via
 * the control panel.
 * 
 * @implements {Destroyable}
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
	 * @param {ProjectProperties} projectProperties 
	 */
	constructor(projectProperties) {

		this.projectProperties = projectProperties;

		const rootConfig = this.projectProperties.rootBuildConfig;
		this.configsTreeDir = TreeView.makeAssetDir('Build Configs', '', null);
		
		this.addConfigInTree(this.configsTreeDir.treeItems, rootConfig);
		this.updateConfigTree(this.projectProperties.buildConfigName);

		TreeView.element.appendChild(this.configsTreeDir);
		this.projectProperties.events.on('setBuildConfig', this.onChangeBuildConfig);

	}

	destroy() {
		this.projectProperties.events.off('setBuildConfig', this.onChangeBuildConfig);
		this.configsTreeDir?.remove();
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
	 * @param {GM.YY.BuildConfig} config 
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
