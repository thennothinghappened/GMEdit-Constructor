import * as compileController from './compiler/igor-controller.js';
import * as hamburgerOptions from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get, tab_current_get } from './utils/project.js';
import { ProjectProperties } from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import { PreferencesMenu } from './ui/preferences/PreferencesMenu.js';
import { BaseError, SolvableError } from './utils/Err.js';
import { ControlPanelTab } from './ui/tabs/ControlPanelTab.js';
import { plugin_update_check } from './update-checker/UpdateChecker.js';
import { mkdir, readdir } from './utils/node/file.js';
import * as nodeModulesProvider from './utils/node/node-import.js';
import { OutputLogTab } from './ui/tabs/OutputLogTab.js';
import { Preferences } from './preferences/Preferences.js';
import { ConfigTreeUi } from './ui/ConfigTreeUi.js';
import { Err, Ok } from './utils/Result.js';
import { ProjectPropertiesMenu } from './ui/preferences/ProjectPropertiesMenu.js';
import { docString } from './utils/StringUtils.js';
import { ControlPanelProblemLogger } from './ui/tabs/ControlPanelProblemReporter.js';
import { GMS2RuntimeIndexerImpl } from './compiler/GMS2RuntimeIndexerImpl.js';

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
export class GMConstructor {

	/**
	 * @private
	 * @type {Preferences}
	 */
	preferences;

	/**
	 * @private
	 * @type {ProblemLogger}
	 */
	problemLogger;

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
	 * @returns {Promise<Result<GMConstructor>>}
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

			console.error(err);

			Electron_Dialog.showMessageBox({
				title: 'GMEdit-Constructor cannot load on Rosetta!',
				message: err.message,
				buttons: ['Dismiss'],
				type: 'error'
			});

			return Err(err);

		}

		const problemLogger = new ControlPanelProblemLogger();
		igorPaths.__setup__();

		// Setting up preferences //
		const preferencesDataPath = nodeModulesProvider.path.join(Electron_App.getPath('userData'), 'GMEdit', 'config', `${PLUGIN_NAME}.json`);

		const gms2RuntimeIndexer = new GMS2RuntimeIndexerImpl();
		const preferences = new Preferences(problemLogger, gms2RuntimeIndexer);
		const preferencesLoadResult = await preferences.load(preferencesDataPath);

		if (!preferencesLoadResult.ok) {
			problemLogger.warn('Failed to load your preferences!', new BaseError(docString(`
				An error occurred in loading your preferences. The default values are being used.
			`), preferencesLoadResult.err))
		}

		ControlPanelTab.providePreferences(preferences);

		ProjectProperties.__setup__(preferences, problemLogger);
		ProjectPropertiesMenu.__setup__(preferences);
		PreferencesMenu.__setup__(preferences);
		hamburgerOptions.__setup__();
		ConfigTreeUi.__setup__();

		// Check for updates //
		if (preferences.checkForUpdates) {
			plugin_update_check().then(res => {
					
				if (!res.ok) {
					return problemLogger.warn('Failed to check for plugin updates.', res.err);
				}

				if (!res.data.update_available) {
					return;
				}

				// Bit silly to use an error message for this but it works :P
				problemLogger.warn('An update is available for Constructor!',
					new SolvableError('There is an update available.', docString(`
						${PLUGIN_NAME} ${res.data.version} is available on GitHub!
						
						${res.data.url}
					`))
				);

			});
		}

		return Ok(new GMConstructor(preferences, problemLogger));

	}

	/**
	 * Final, synchronous setup for the plugin instance happens here, once we've done the various
	 * asynchronous and fallible options during the {@link initialize} call.
	 * 
	 * @private
	 * @param {Preferences} preferences 
	 * @param {ProblemLogger} problemLogger
	 */
	constructor(preferences, problemLogger) {
		this.preferences = preferences;
		this.problemLogger = problemLogger;
	}

	/**
	 * Clean up the plugin instance upon disabling or reloading.
	 */
	destroy() {

		ProjectProperties.__cleanup__();
		ProjectPropertiesMenu.__cleanup__();
		compileController.__cleanup__();
		hamburgerOptions.__cleanup__();
		ConfigTreeUi.__cleanup__();
		ControlPanelTab.cleanup();

		delete window.GMConstructor;
		
	}

	/**
	 * Set up the plugin for the given opened project.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectOpen']} event
	 */
	onProjectOpen = ({ project }) => {

	};

	/**
	 * Clean the plugin for the opened project.
	 * 
	 * @private
	 * @param {GMEdit.PluginEventMap['projectClose']} event
	 */
	onProjectClose = ({ project }) => {

	};

	/**
	 * Run a task on our current project.
	 * 
	 * @param {GMEdit.Project} project 
	 * @param {AtLeast<GMS2.IgorSettings, 'verb'>} partialSettings
	 */
	async #runTask(project, partialSettings) {

		const projectPropertiesResult = ProjectProperties.get(project);

		if (!projectPropertiesResult.ok) {
			return;
		}

		const projectProperties = projectPropertiesResult.data;

		/** @type {GMS2.IgorSettings} */
		const settings = {
			verb: partialSettings.verb,
			buildPath: partialSettings.buildPath ?? this.#getBuildDir(project),
			platform: partialSettings.platform ?? projectProperties.zeusPlatform ?? igorPaths.igor_user_platform,
			runner: partialSettings.runner ?? projectProperties.runtimeBuildTypeOrDef,
			threads: partialSettings.threads ?? 8,
			configName: partialSettings.configName ?? projectProperties.buildConfigName
		};
		
		const runtimeResult = projectProperties.runtime;
		
		if (!runtimeResult.ok) {
			
			const channel = projectProperties.runtimeChannelTypeOrDef;
			const err = new SolvableError(
				`No ${channel} runtimes available to compile!`,
				docString(`
					Try specifying a different runtime channel type below, or check the runtime
					search path for ${channel} runtimes.
				`),
				runtimeResult.err
			);

			this.problemLogger.error('No installed runtimes available of this type', err);
			return;
		}

		const runtime = runtimeResult.data;
		const supported = (runtime.version.format === projectProperties.projectFormat);

		if (!supported) {

			const err = new SolvableError(
				`Runtime version '${runtime.version}' is not compatible with this project format!`,
				docString(`
					This project is in the YY ${projectProperties.projectFormat} format, where the chosen runtime
					(${runtime.version}) expects the ${runtime.version.format} format.
					
					Please pick a matching runtime, or you can convert your project to the desired
					format using ProjectTool in the IDE.
				`)
			);

			this.problemLogger.error('Incompatible runtime selected', err);
			return;
		}

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

				this.problemLogger.error(res.err.message, err);
				return;
				
			}

		}
		
		const userResult = projectProperties.user;

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

		const jobResult = await compileController.job_run(project, runtime,
			(userResult.ok ? userResult.data : undefined),
			settings,
			jobIdToReuse
		);

		if (!jobResult.ok) {
			this.problemLogger.error('Failed to run Igor job!', jobResult.err);
			return;
		}

		tab.attach(jobResult.data);
		tab.focus();

	}

	/**
	 * Get the build directory to use for the given project.
	 * @param {GMEdit.Project} project 
	 * @returns {string}
	 */
	#getBuildDir(project) {
		
		if (this.preferences.useGlobalBuildPath) {
			return nodeModulesProvider.path.join(this.preferences.globalBuildPath, project.displayName);
		}

		return nodeModulesProvider.path.join(project.dir, 'build');

	}

	showControlPanel = () => ControlPanelTab.show();

	runCurrent = () => {

		const project = project_current_get();

		if (project === undefined || !GMConstructor.supportsProjectFormat(project)) {
			return;
		}

		this.#runTask(project, { verb: 'Run' });

	}

	packageCurrent = () => {

		const project = project_current_get();

		if (project === undefined || !GMConstructor.supportsProjectFormat(project)) {
			return;
		}

		this.#runTask(project, { verb: 'Package' });
		
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
		
		const project = project_current_get();

		if (project === undefined || !GMConstructor.supportsProjectFormat(project)) {
			return;
		}

		// Stop existing running jobs, as they wouldn't be too happy about their directories being cleared!
		const promises = compileController.jobs
			.filter(it => it.project === project)
			.map(it => it.stop());

		await Promise.all(promises);

		const build_dir = this.#getBuildDir(project);

		if (Electron_FS.existsSync(build_dir)) {
			try {
				Electron_FS.rmSync(build_dir, { recursive: true });
			} catch (err) {
				this.problemLogger.error('Failed to clean project!', new SolvableError(
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
	static supportsProjectFormat(project) {
		return project.isGMS23;
	}

	/**
	 * Some exposed functions to access at runtime via `window.GMConstructor.__debuggery.*`.
	 */
	__debuggery = {
		project_current_get,
		Preferences,
		ProjectProperties
	};

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
