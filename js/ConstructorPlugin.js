import * as compileController from './compiler/igor-controller.js';
import * as hamburgerOptions from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get, tab_current_get } from './utils/project.js';
import { ProjectProperties } from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import { PreferencesMenu } from './ui/preferences/PreferencesMenu.js';
import { BaseError, InvalidStateErr, SolvableError } from './utils/Err.js';
import { plugin_update_check } from './update-checker/UpdateChecker.js';
import { mkdir, readdir } from './utils/node/file.js';
import * as nodeModulesProvider from './utils/node/node-import.js';
import { OutputLogTab } from './ui/tabs/OutputLogTab.js';
import { Preferences } from './preferences/Preferences.js';
import { ConfigTreeUi } from './ui/ConfigTreeUi.js';
import { Err, Ok } from './utils/Result.js';
import { ProjectPropertiesMenu } from './ui/preferences/ProjectPropertiesMenu.js';
import { docString } from './utils/StringUtils.js';
import { GMS2RuntimeIndexerImpl } from './compiler/GMS2RuntimeIndexerImpl.js';
import { ControlPanelImpl } from './ui/controlpanel/ControlPanelImpl.js';

/**
 * Name of the plugin 
 * @type {String}
 */
export let PLUGIN_NAME;

/**
 * Current plugin version
 * @type {String}
 */
export let PLUGIN_VERSION;

/**
 * Main controller instance for the plugin!
 */
export class ConstructorPlugin {

	/**
	 * @private
	 * @type {ControlPanel}
	 */
	controlPanel;

	/**
	 * @private
	 * @type {Preferences}
	 */
	preferences;

	/**
	 * @private
	 * @type {PreferencesMenu|undefined}
	 */
	preferencesMenu = undefined;

	/**
	 * @type {ProjectComponents|undefined}
	 */
	currentProjectComponents = undefined;

	/**
	 * Initialise an instance of the plugin!
	 * 
	 * @param {string} pluginName Name of the plugin.
	 * @param {string} pluginVersion Current version of the plugin.
	 * @param {NodeModules} nodeModules References to various NodeJS modules we need.
	 * @returns {Promise<Result<ConstructorPlugin>>}
	 */
	static async initialize(pluginName, pluginVersion, nodeModules) {

		PLUGIN_NAME = pluginName;
		PLUGIN_VERSION = pluginVersion;

		nodeModulesProvider.inject(nodeModules);
		
		// Prevent Constructor loading when running on Rosetta, since it has a bunch of issues there.
		if (rosetta_check(nodeModulesProvider.child_process.execSync)) {

			const err = new BaseError(docString(`
				${PLUGIN_NAME} does not work correctly on Rosetta - please consider using GMEdit's
				native Arm64 build found at https://yellowafterlife.itch.io/gmedit
			`));

			Electron_Dialog.showMessageBox({
				title: 'GMEdit-Constructor cannot load on Rosetta!',
				message: err.message,
				buttons: ['Dismiss'],
				type: 'error'
			});

			return Err(err);

		}

		const controlPanel = new ControlPanelImpl();
		igorPaths.__setup__();

		const preferences = new Preferences(controlPanel, new GMS2RuntimeIndexerImpl());
		const preferencesDataPath = nodeModulesProvider.path.join(Electron_App.getPath('userData'), 'GMEdit', 'config', `${PLUGIN_NAME}.json`);
		const preferencesLoadResult = await preferences.load(preferencesDataPath);

		if (!preferencesLoadResult.ok) {
			controlPanel.warn('Failed to load your preferences!', new BaseError(docString(`
				An error occurred in loading your preferences. The default values are being used.
			`), preferencesLoadResult.err))
		}

		controlPanel.setPreferencesMenu(new PreferencesMenu(preferences));
		hamburgerOptions.__setup__();

		return Ok(new ConstructorPlugin(preferences, controlPanel));

	}

	/**
	 * Final, synchronous setup for the plugin instance happens here, once we've done the various
	 * asynchronous and fallible options during the {@link initialize} call.
	 * 
	 * @private
	 * @param {Preferences} preferences 
	 * @param {ControlPanel} controlPanel
	 */
	constructor(preferences, controlPanel) {
		
		this.preferences = preferences;
		this.controlPanel = controlPanel;

		const currentOpenProject = project_current_get();

		if (currentOpenProject !== undefined) {
			this.onProjectOpen({ project: currentOpenProject });
		}

		if (this.preferences.checkForUpdates) {
			plugin_update_check().then(res => {
					
				if (!res.ok) {
					return this.controlPanel.warn('Failed to check for plugin updates.', res.err);
				}

				if (!res.data.update_available) {
					return;
				}

				// Bit silly to use an error message for this but it works :P
				this.controlPanel.warn('An update is available for Constructor!',
					new SolvableError('There is an update available.', docString(`
						${PLUGIN_NAME} ${res.data.version} is available on GitHub!
						
						${res.data.url}
					`))
				);

			});
		}

		const UIPreferences = $gmedit['ui.Preferences'];

		if (UIPreferences.menuMain != undefined) {
			this.onPreferencesBuilt({ target: UIPreferences.menuMain });
		}
		
		GMEdit.on('projectOpen', this.onProjectOpen);
		GMEdit.on('projectClose', this.onProjectClose);
		GMEdit.on('preferencesBuilt', this.onPreferencesBuilt);
		GMEdit.on('projectPropertiesBuilt', this.onProjectPropertiesBuilt);

	}

	/**
	 * Clean up the plugin instance upon disabling or reloading.
	 */
	destroy() {

		GMEdit.off('projectOpen', this.onProjectOpen);
		GMEdit.off('projectClose', this.onProjectClose);
		GMEdit.off('preferencesBuilt', this.onPreferencesBuilt);
		GMEdit.off('projectPropertiesBuilt', this.onProjectPropertiesBuilt);

		if (this.currentProjectComponents !== undefined) {
			this.destroyCurrentProjectComponents();
		}

		compileController.__cleanup__();
		hamburgerOptions.__cleanup__();
		this.controlPanel.destroy();

		if (this.preferencesMenu !== undefined) {
			this.preferencesMenu.element.remove();
			this.preferencesMenu.destroy();
		}

		delete window.ConstructorPlugin;
		
	}

	/**
	 * Clean up the plugin state for the current project. Used when either closing the project, or
	 * when cleaning up the plugin.
	 * 
	 * @private
	 */
	destroyCurrentProjectComponents = () => {
		
		if (this.currentProjectComponents === undefined) {
			return;
		}

		const {
			configTreeUi,
			projectPropertiesMenuComponents
		} = this.currentProjectComponents;

		if (projectPropertiesMenuComponents !== undefined) {
			projectPropertiesMenuComponents.projectPropertiesMenu.destroy();
			projectPropertiesMenuComponents.group.remove();
		}

		configTreeUi.destroy();
		delete this.currentProjectComponents;

	};

	/**
	 * Set up the plugin for the given opened project.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectOpen']} event
	 */
	onProjectOpen = ({ project }) => {

		if (this.currentProjectComponents !== undefined) {
			this.destroyCurrentProjectComponents();
		}

		if (!this.supportsProjectFormat(project)) {
			return;
		}

		const projectFormat = project_format_get(project);

		if (!projectFormat.ok) {

			this.controlPanel.error('Plugin Internal Error!', new BaseError(docString(`
				Failed to parse project format of project "${project.name}".
				Constructor will be disabled on this project!
			`), projectFormat.err));

			return;

		}

		if (projectFormat.data === '[Unsupported]') {
			return;
		}

		const projectProperties = new ProjectProperties(
			project,
			projectFormat.data,
			this.preferences,
			this.preferences.getLocalProjectPropertiesStore(project),
			this.controlPanel
		);

		const configTreeUi = new ConfigTreeUi(projectProperties);

		this.controlPanel.setProjectPropertiesMenu(new ProjectPropertiesMenu(
			projectProperties,
			this.preferences
		));

		this.currentProjectComponents = {
			project,
			projectProperties,
			configTreeUi,
		};

	};

	/**
	 * Clean the plugin for the opened project.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectClose']} event
	 */
	onProjectClose = ({ project }) => {

		const components = this.currentProjectComponents;

		if (components === undefined) {
			return;
		}

		if (components.project !== project) {
			this.controlPanel.error('Plugin Internal Error!', new InvalidStateErr(docString(`
				Somehow the project being closed (${project.name}) is not the project that
				Constructor tracked opening???
			`)));
			return;
		}

		this.controlPanel.clearProjectPropertiesMenu();
		this.destroyCurrentProjectComponents();
		
	};

	/**
	 * Add our preferences menu to the UI when called to.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['preferencesBuilt']} event
	 */
	onPreferencesBuilt = ({ target }) => {

		const UIPreferences = $gmedit['ui.Preferences'];
		const group = target.querySelector(`.plugin-settings[for^="${PLUGIN_NAME}"]`);

		if (group instanceof HTMLDivElement) {

			this.preferencesMenu ??= new PreferencesMenu(this.preferences);
			
			group.appendChild(this.preferencesMenu.element);
			UIPreferences.addText(group, `Version: ${PLUGIN_VERSION}`);

		}

	};

	/**
	 * Add our project properties menu to the UI when called to.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectPropertiesBuilt']} event
	 */
	onProjectPropertiesBuilt = ({ project, target }) => {

		const UIPreferences = $gmedit['ui.Preferences'];

		if (this.currentProjectComponents?.project !== project) {
			return;
		}

		const projectPropertiesMenu = new ProjectPropertiesMenu(
			this.currentProjectComponents.projectProperties,
			this.preferences
		);

		const group = UIPreferences.addGroup(target, PLUGIN_NAME);
		group.appendChild(projectPropertiesMenu.element);

		this.currentProjectComponents.projectPropertiesMenuComponents = {
			group,
			projectPropertiesMenu
		};

	};

	/**
	 * Run a task on our current project.
	 * 
	 * @param {ProjectComponents} components
	 * @param {AtLeast<GMS2.IgorSettings, 'verb'>} partialSettings
	 */
	async #runTask(components, partialSettings) {

		const projectProperties = components.projectProperties;
		const runtime = this.findRuntime(components);

		if (!runtime.ok) {
			this.controlPanel.error('Couldn\'t find a runtime to use!', runtime.err);
			return;
		}

		/** @type {GMS2.IgorSettings} */
		const settings = {
			verb: partialSettings.verb,
			buildPath: partialSettings.buildPath ?? this.getBuildDir(components.project),
			platform: partialSettings.platform ?? projectProperties.zeusPlatform ?? igorPaths.igor_user_platform,
			runner: partialSettings.runner ?? projectProperties.runtimeBuildTypeOrDef,
			threads: partialSettings.threads ?? 8,
			configName: partialSettings.configName ?? projectProperties.buildConfigName
		};

		if (this.preferences.saveOnRun) {
			open_files_save();
		}

		if (!(await readdir(settings.buildPath)).ok) {
			
			const res = await mkdir(settings.buildPath, true);
			
			if (!res.ok) {

				const err = new SolvableError(
					'Failed to create the build directory for project output!',
					docString(`
						Ensure the path '${settings.buildPath}' is valid, and that GMEdit would have
						permission to edit files and directories there.
					`),
					res.err
				);

				this.controlPanel.error(res.err.message, err);
				return;
				
			}

		}
		
		const userInfo = this.preferences.getUser(projectProperties.runtimeChannelTypeOrDef);

		/** @type {OutputLogTab|undefined} */
		let tab = undefined;

		/** @type {number|undefined} */
		let jobIdToReuse = undefined;

		if (projectProperties.reuseOutputTabOrDef) {

			tab = OutputLogTab.findUnusedOrSteal();
			
			if (tab?.inUse) {
				jobIdToReuse = tab.job?.id;
			}

		}

		tab ??= OutputLogTab.openNew();

		const jobResult = await compileController.job_run(
			components.project,
			runtime.data,
			userInfo,
			settings,
			jobIdToReuse
		);

		if (!jobResult.ok) {
			this.controlPanel.error('Failed to run Igor job!', jobResult.err);
			return;
		}

		tab.attach(jobResult.data);
		tab.focus();

	}

	/**
	 * 
	 * @private
	 * @param {ProjectComponents} components
	 * @returns {Result<GMS2.RuntimeInfo, SolvableError>}
	 */
	findRuntime({ projectProperties }) {
		
		const preferredRuntimeVersion = projectProperties.runtimeVersion;

		if (preferredRuntimeVersion !== undefined) {

			const result = this.preferences.getRuntimeInfo(
				projectProperties.runtimeChannelTypeOrDef,
				preferredRuntimeVersion
			);

			if (result.ok) {
				return Ok(result.data);
			}

			// FIXME: we don't know for certain what the issue is! Stolen from a removed ProjectProperties getter.
			return Err(new SolvableError(
				docString(`
					Project\'s selected Runtime is not installed.

					This project specifies the runtime version '${preferredRuntimeVersion}', but
					this version doesn't appear to be installed.
					
					The default runtime will be used, though the value in the config will not be
					modified unless you do so.
				`),
				docString(`
					Install the runtime in the IDE and reload GMEdit if this is the correct
					runtime, otherwise you may change the value to an installed runtime.
				`),
				result.err
			));

		}

		// Choose a runtime from the full list.
		const runtimes = this.preferences.getInstalledRuntimeVersions(projectProperties.runtimeChannelTypeOrDef);

		if (runtimes === undefined) {
			return Err(new SolvableError(
				docString(`
					No runtimes installed in this release channel.

					There don't seem to be any ${projectProperties.runtimeChannelTypeOrDef}
					runtimes installed at your chosen installation path, or that path is
					otherwise incorrect.
				`),
				docString(`
					Try specifying a different runtime channel type below, or check the runtime
					search path for ${projectProperties.runtimeChannelTypeOrDef} runtimes.
				`)
			));
		}

		// Pick the first (newest) compatible runtime.
		const runtime = runtimes.find(it => it.version.format === projectProperties.projectFormat);

		if (runtime !== undefined) {
			return Ok(runtime);
		}

		return Err(new SolvableError(
			docString(`
				Constructor couldn't find any installed runtimes that it thinks are
				compatible with the format of your project
				(${projectProperties.projectFormat}).
			`),
			docString(`
				Install a runtime that uses this format, or if you know that you have a
				compatible runtime that Constructor missed, you can manually override the
				choice through the project's preferences below.
			`)
		));
		
	}

	/**
	 * Get the build directory to use for the given project.
	 * 
	 * @private
	 * @param {GMEdit.Project} project 
	 * @returns {string}
	 */
	getBuildDir(project) {
		
		if (this.preferences.useGlobalBuildPath) {
			return nodeModulesProvider.path.join(this.preferences.globalBuildPath, project.displayName);
		}

		return nodeModulesProvider.path.join(project.dir, 'build');

	}

	showControlPanel = () => this.controlPanel.open();

	runCurrent = () => {
		if (this.currentProjectComponents !== undefined) {
			this.#runTask(this.currentProjectComponents, { verb: 'Run' });
		}
	}

	packageCurrent = () => {
		if (this.currentProjectComponents !== undefined) {
			this.#runTask(this.currentProjectComponents, { verb: 'Package' });
		}
	}

	stopCurrent = () => {
		
		const tab = tab_current_get();

		if (tab === undefined) {
			return;
		}

		const editor = tab.gmlFile.editor;

		if (!(editor instanceof OutputLogTab)) {
			return;
		}

		editor.stopJob();

	}

	cleanCurrent = async () => {

		const components = this.currentProjectComponents;
		
		if (components === undefined) {
			return;
		}

		// Stop existing running jobs, as they wouldn't be too happy about their directories being cleared!
		const promises = compileController.jobs
			.filter(it => it.project === components.project)
			.map(it => it.stop());

		await Promise.all(promises);

		const build_dir = this.getBuildDir(components.project);

		if (Electron_FS.existsSync(build_dir)) {
			try {
				Electron_FS.rmSync(build_dir, { recursive: true });
			} catch (err) {
				this.controlPanel.error('Failed to clean project!', new SolvableError(
					`An unexpected error occurred while removing the build directory '${build_dir}'.`,
					'Do you have this directory open somewhere?',
					err
				));
				return;
			}
		}

		Electron_Dialog.showMessageBox({
			message: `The build directory '${build_dir}' has been cleared.`,
			buttons: ['Ok']
		});

	}

	/**
	 * Check whether Constructor supports the given project's format at all.
	 * 
	 * @param {GMEdit.Project} project 
	 * @returns {boolean}
	 */
	supportsProjectFormat(project) {
		return project.isGMS23;
	}

}

/**
 * Make sure we aren't running on rosetta, since GMEdit has
 * a native build and Rosetta seems to cause some weirdness!
 * 
 * @param {import('node:child_process').execSync} execSync
 */
function rosetta_check(execSync) {

	if (process.platform !== 'darwin') {
		return false;
	}

	if (process.arch !== 'x64') {
		return false;
	}

	const cmd = 'sysctl -in sysctl.proc_translated';
	const output = execSync(cmd).toString('utf-8');

	// If the return of this command is 1, we are running in Rosetta.
	return output.includes('1');

}
