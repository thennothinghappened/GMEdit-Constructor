import * as compileController from './compiler/igor-controller.js';
import * as hamburgerOptions from './ui/HamburgerOptions.js';
import { project_current_get, open_files_save, project_format_get, tab_current_get } from './utils/project.js';
import { ProjectProperties } from './preferences/ProjectProperties.js';
import * as igorPaths from './compiler/igor-paths.js';
import * as preferencesMenu from './ui/preferences/PreferencesMenu.js';
import { BaseError, SolvableError } from './utils/Err.js';
import { ControlPanelTab } from './ui/tabs/ControlPanelTab.js';
import { plugin_update_check } from './update-checker/UpdateChecker.js';
import { mkdir, readdir } from './utils/node/file.js';
import * as node from './utils/node/node-import.js';
import { OutputLogTab } from './ui/tabs/OutputLogTab.js';
import { Preferences } from './preferences/Preferences.js';
import { ConfigTreeUi } from './ui/ConfigTreeUi.js';
import { Err, Ok, unwrap } from './utils/Result.js';
import { ProjectPropertiesMenu } from './ui/preferences/ProjectPropertiesMenu.js';
import { docString } from './utils/StringUtils.js';

/**
 * Name of the plugin 
 * @type {String}
 */
export let plugin_name;

/**
 * Current plugin version
 * @type {String}
 */
export let plugin_version;

/**
 * Main controller instance for the plugin!
 */
export class GMConstructor {

	/**
	 * Run a task on our current project.
	 * 
	 * @param {GMEdit.Project} project 
	 * @param {AtLeast<Zeus.IgorSettings, 'verb'>} partial_settings
	 */
	async #runTask(project, partial_settings) {

		const projectProperties = ProjectProperties.get(project);

		/** @type {Zeus.IgorSettings} */
		const settings = {
			verb: partial_settings.verb,
			buildPath: partial_settings.buildPath ?? this.#getBuildDir(project),
			platform: partial_settings.platform ?? projectProperties.zeusPlatform ?? igorPaths.igor_user_platform,
			runner: partial_settings.runner ?? projectProperties.runtimeBuildTypeOrDef,
			threads: partial_settings.threads ?? 8,
			configName: partial_settings.configName ?? projectProperties.buildConfigName
		};
		
		const runtime_res = projectProperties.runtime;
		
		if (!runtime_res.ok) {
			
			const runtime_type = projectProperties.runtimeChannelTypeOrDef;
			const err = new SolvableError(
				`No ${runtime_type} runtimes available to compile!`,
				docString(`
					Try specifying a different runtime channel type below, or check the runtime
					search path for ${runtime_type} runtimes.
				`),
				runtime_res.err
			);

			return ControlPanelTab
				.error('No installed runtimes available of this type', err)
				.view(true);
		}

		const runtime = runtime_res.data;
		const supportedRes = runtime.version.supportedByProject(project);

		if (!supportedRes.ok) {

			const err = new BaseError(
				`Failed to check runtime version '${runtime.version}' is compatible with the project!`,
				supportedRes.err
			);

			return ControlPanelTab
				.error('Runtime compatibility check for this project failed', err)
				.view(true);

		}

		const supported = supportedRes.data;

		if (!supported) {

			const format = unwrap(project_format_get(project));

			const err = new SolvableError(
				`Runtime version '${runtime.version}' is not compatible with this project format!`,
				docString(`
					This project is in the YY ${format} format, where the chosen runtime
					(${runtime.version}) expects the ${runtime.version.format} format.
					
					Please pick a matching runtime, or you can convert your project to the desired
					format using ProjectTool in the IDE.
				`)
			);

			return ControlPanelTab
				.error('Incompatible runtime selected', err)
				.view(true);
		}

		if (Preferences.saveOnRun) {
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

				return ControlPanelTab
					.error(res.err.message, err)
					.view(true);
				
			}

		}
		
		const userResult = projectProperties.user;

		/** @type {OutputLogTab|undefined} */
		let tab = undefined;

		/** @type {number|undefined} */
		let jobIdToReuse = undefined;

		if (projectProperties.reuseCompilerTabOrDef) {

			tab = OutputLogTab.findUnusedOrSteal();
			
			if (tab?.inUse) {
				jobIdToReuse = tab.job?.id;
			}

		}

		tab ??= OutputLogTab.openNew();

		const jobResult = await compileController.job_run(
			project,
			runtime_res.data,
			(userResult.ok ? userResult.data : undefined),
			settings,
			jobIdToReuse
		);

		if (!jobResult.ok) {
			return ControlPanelTab
				.error('Failed to run Igor job!', jobResult.err)
				.view(true);
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
		
		if (Preferences.useGlobalBuildPath) {
			return node.path.join(Preferences.globalBuildPath, project.displayName);
		}

		return node.path.join(project.dir, 'build');

	}

	onControlPanel = () => {
		ControlPanelTab.view(true);
	}

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
				return ControlPanelTab
					.error('Failed to clean project!', new SolvableError(
						`An unexpected error occurred while removing the build directory '${build_dir}'.`,
						'Do you have this directory open somewhere?',
						err
					))
					.view();
			}
		}

		Electron_Dialog.showMessageBox({
			message: `The build directory '${build_dir}' has been cleared.`,
			buttons: ['Ok']
		});

	}

	/**
	 * Create an instance of the plugin.
	 * 
	 * @param {string} _plugin_name Name of the plugin - redundant, but saves typing it everywhere.
	 * @param {string} _plugin_version Current version of the plugin
	 * @param {import('node:path')} node_path 
	 * @param {import('node:child_process')} node_child_process
	 * @returns {Promise<Result<GMConstructor>>}
	 */
	static async create(_plugin_name, _plugin_version, node_path, node_child_process) {
		
		// Prevent Constructor loading when running on Rosetta, since it has a bunch of issues there.
		if (rosetta_check(node_child_process.execSync)) {

			const err = new BaseError(docString(`
				${_plugin_name} does not work correctly on Rosetta - please consider using GMEdit's
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

		node.__setup__(node_path, node_child_process);

		plugin_name = _plugin_name;
		plugin_version = _plugin_version;

		igorPaths.__setup__();

		// Setting up preferences //
		const preferences_res = await Preferences.__setup__();

		if (!preferences_res.ok) {
			return Err(new BaseError('Failed to init preferences', preferences_res.err));
		}

		ProjectProperties.__setup__();
		ProjectPropertiesMenu.__setup__();
		preferencesMenu.__setup__();
		hamburgerOptions.__setup__();
		ConfigTreeUi.__setup__();

		// Check for updates //
		if (Preferences.checkForUpdates) {

			plugin_update_check()
				.then(res => {
					
					if (!res.ok) {
						return ControlPanelTab.warn(
							'Failed to check for plugin updates.',
							res.err
						);
					}

					if (!res.data.update_available) {
						return;
					}

					// Bit silly to use an error message for this but it works :P
					ControlPanelTab.warn(
						'An update is available for Constructor!',
						new SolvableError('There is an update available.', docString(`
							${plugin_name} ${res.data.version} is available on GitHub!
							
							${res.data.url}
						`))
					);

				});
			
		}

		return Ok(new GMConstructor());
	}

	/**
	 * Called on deregistering the plugin.
	 */
	async cleanup() {

		Preferences.__cleanup__();
		ProjectProperties.__cleanup__();
		ProjectPropertiesMenu.__cleanup__();
		compileController.__cleanup__();
		hamburgerOptions.__cleanup__();
		ConfigTreeUi.__cleanup__();

		delete window.GMConstructor;
		
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
