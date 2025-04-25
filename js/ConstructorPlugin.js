import * as compileController from './compiler/igor-controller.js';
import { HamburgerOptions } from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get, tab_current_get } from './utils/project.js';
import { ProjectProperties } from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import { PreferencesMenu } from './ui/PreferencesMenu.js';
import { BaseError, InvalidStateErr, SolvableError } from './utils/Err.js';
import { plugin_update_check } from './update-checker/UpdateChecker.js';
import * as nodeModulesProvider from './utils/node/node-import.js';
import { OutputLogTab } from './ui/tabs/OutputLogTab.js';
import { Preferences } from './preferences/Preferences.js';
import { ConfigTreeUi } from './ui/ConfigTreeUi.js';
import { Err, Ok } from './utils/Result.js';
import { ProjectPropertiesMenu } from './ui/ProjectPropertiesMenu.js';
import { docString } from './utils/StringUtils.js';
import { GMS2RuntimeIndexerImpl } from './compiler/GMS2RuntimeIndexerImpl.js';
import { ControlPanelImpl } from './ui/controlpanel/ControlPanelImpl.js';
import { UserIndexerImpl } from './compiler/UserIndexerImpl.js';
import { use } from './utils/scope-extensions/use.js';

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
 * 
 * @implements {Destroyable}
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
	 * @private
	 * @type {HamburgerOptions}
	 */
	hamburgerOptions;

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

		const preferences = new Preferences(
			controlPanel,
			new GMS2RuntimeIndexerImpl(),
			new UserIndexerImpl()
		);

		const preferencesDataPath = nodeModulesProvider.path.join(Electron_App.getPath('userData'), 'GMEdit', 'config', `${PLUGIN_NAME}.json`);
		const preferencesLoadResult = await preferences.load(preferencesDataPath);

		if (!preferencesLoadResult.ok) {
			controlPanel.warn('Failed to load your preferences!', new BaseError(
				`An error occurred in loading your preferences. The default values are being used.`,
				preferencesLoadResult.err
			))
		}

		controlPanel.setPreferencesMenu(new PreferencesMenu(preferences));

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

		this.hamburgerOptions = new HamburgerOptions({
			showControlPanel: this.showControlPanel,
			stopCurrentProject: this.stopCurrent,
			runCurrentProject: this.runCurrent,
			cleanCurrentProject: this.cleanCurrent,
			packageCurrentProject: this.packageCurrent
		});

		const currentOpenProject = project_current_get();

		if (currentOpenProject !== undefined) {

			this.onProjectOpen({ project: currentOpenProject });

			if (currentOpenProject.propertiesElement != undefined) {
				this.onProjectPropertiesBuilt({
					project: currentOpenProject,
					target: currentOpenProject.propertiesElement
				});
			}

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
		this.hamburgerOptions.destroy();
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
			projectPropertiesMenuComponents,
			projectProperties
		} = this.currentProjectComponents;

		if (projectPropertiesMenuComponents !== undefined) {
			projectPropertiesMenuComponents.projectPropertiesMenu.destroy();
			projectPropertiesMenuComponents.group.remove();
		}

		for (const tab of OutputLogTab.getOpenTabs()) {
			tab.close();
		}
		
		configTreeUi.destroy();
		projectProperties.destroy();

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

		if (!project.isGMS23) {
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

		if (!projectFormat.data.supported) {
			return;
		}

		const projectProperties = new ProjectProperties(
			project,
			projectFormat.data.version,
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

		this.hamburgerOptions.enableProjectActionItems(true);

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
		this.hamburgerOptions.enableProjectActionItems(false);
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
			group.classList.add('gm-constructor-control-panel');

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

		if (this.currentProjectComponents === undefined) {
			return;
		}

		if (this.currentProjectComponents.project !== project) {
			return;
		}

		if (this.currentProjectComponents.projectPropertiesMenuComponents !== undefined) {
			return;
		}

		const projectPropertiesMenu = new ProjectPropertiesMenu(
			this.currentProjectComponents.projectProperties,
			this.preferences
		);

		const group = UIPreferences.addGroup(target, PLUGIN_NAME);
		group.appendChild(projectPropertiesMenu.element);
		group.classList.add('gm-constructor-control-panel');

		this.currentProjectComponents.projectPropertiesMenuComponents = {
			group,
			projectPropertiesMenu
		};

	};

	/**
	 * Execute the given task on the given project.
	 * 
	 * @param {GMS2.IgorVerb} taskVerb
	 * @param {ProjectComponents} components
	 */
	async executeTask(taskVerb, { project, projectProperties }) {

		/** @type {GMS2.RuntimeInfo|undefined} */
		let runtime = undefined;

		/** @type {GM.ReleaseChannel} */
		let channel;

		if (projectProperties.runtimeVersion !== undefined) {

			channel = /** @type {GM.ReleaseChannel} */ (projectProperties.runtimeReleaseChannel);
			const result = this.preferences.getRuntimeInfo(channel, projectProperties.runtimeVersion);
	
			if (!result.ok) {
				this.controlPanel.error('Project\'s selected Runtime is not installed.', new SolvableError(
					docString(`
						This project specifies the runtime version
						'${projectProperties.runtimeVersion}', but this version doesn't appear to be
						installed!
					`),
					docString(`
						Install the specified runtime in the IDE and reload GMEdit if this is the
						intended runtime version, otherwise you may change the value to an installed
						runtime.
					`),
					result.err
				));

				return;
			}

			runtime = result.data;

		}

		if (runtime === undefined) {

			const result = compileController.findCompatibleRuntime(
				this.preferences,
				projectProperties.projectVersion,
				projectProperties.runtimeReleaseChannel
			);

			if (!result.ok) {
				switch (result.err.type) {

					case 'none-compatible':

						/** @type {SolvableError} */
						let error;

						if (result.err.channel !== undefined) {
							error = new SolvableError(
								docString(`
									None of your installed runtimes in the ${result.err.channel}
									channel are compatible with its version
									(${projectProperties.projectVersion}), to Constructor's
									knowledge.
								`),
								docString(`
									a) Install a runtime that's compatible with the project via the
									IDE and reload Constructor.

									b) Choose a different channel, or clear the channel preference
									for this project.

									c) Manually pick a runtime you know to be compatible. Feel free
									to make a bug report about this too! :D
								`)
							);
						} else {
							error = new SolvableError(
								docString(`
									None of your installed runtimes are compatible with its version
									(${projectProperties.projectVersion}), to Constructor's
									knowledge.
								`),
								docString(`
									a) Install a runtime that's compatible with the project via the
									IDE and reload Constructor.

									b) Manually pick a runtime you know to be compatible. Feel free
									to make a bug report about this too! :D
								`)
							);
						}

						this.controlPanel.error('No compatible runtimes found!', error);

					return;

					case 'channel-empty':
						this.controlPanel.error('No runtimes installed in this channel.', new SolvableError(
							docString(`
								There don't seem to be any ${result.err.channel} runtimes installed
								at your chosen installation path, or that path is otherwise
								incorrect.
							`),
							docString(`
								Try specifying a different runtime channel type below, or check the
								runtime search path for ${result.err.channel} runtimes.
							`)
						));
					return;

				}
			}

			runtime = result.data.runtime;
			channel = result.data.channel;
			
		}

		// @ts-expect-error Channel is not used before assignment. Both cases set it.
		const user = this.preferences.getDefaultUser(channel);

		if (user === undefined) {
			this.controlPanel.error('No user found to compile with.', new SolvableError(
				docString(`
					Constructor couldn't find any users at the data path specified for the ${
						// @ts-expect-error Channel is not used before assignment. Both cases set it.
						channel
					} installation.
				`),
				docString(`
					Try specifying a different runtime channel type below, or check that the
					installation data path for ${
						// @ts-expect-error Channel is not used before assignment. Both cases set it.
						channel
					} is correct.
				`)
			));
			return;
		}

		if (this.preferences.saveOnRun) {
			open_files_save();
		}

		/** @type {GMS2.IgorSettings} */
		const settings = {
			verb: taskVerb,
			buildPath: this.getBuildDir(project),
			platform: projectProperties.gms2Platform ?? igorPaths.igor_user_platform,
			device: projectProperties.device,
			runner: projectProperties.runtimeBuildTypeOrDef,
			configName: projectProperties.buildConfigName
		};

		/** @type {OutputLogTab|undefined} */
		let outputTab = undefined;

		/** @type {number|undefined} */
		let jobIdToReuse = undefined;

		if (projectProperties.reuseOutputTabOrDef) {

			outputTab = OutputLogTab.find();
			
			if (outputTab?.inUse) {
				jobIdToReuse = outputTab.job?.id;
			}

		}

		const job = await compileController.job_run(project, runtime, user, settings, jobIdToReuse);

		if (!job.ok) {
			this.controlPanel.error('Failed to run Igor job!', job.err);
			return;
		}

		outputTab ??= OutputLogTab.openNew();
		outputTab.attach(job.data);
		outputTab.focus();

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
			this.executeTask('Run', this.currentProjectComponents);
		}
	}

	packageCurrent = () => {
		if (this.currentProjectComponents !== undefined) {
			this.executeTask('Package', this.currentProjectComponents);
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
