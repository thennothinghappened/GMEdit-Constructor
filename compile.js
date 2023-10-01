/**
 * @param {(error: string) => void} showError
 */
function GMConstructorCompile(showError) {

    const { spawn } = require('child_process');

    /** @type {{[key in NodeJS.Platform]: string}} */
    const defaultRuntimePaths = {
        'win32': 'C:\\ProgramData\\GameMakerStudio2\\Cache\\runtimes',
        'darwin': '/Users/Shared/GameMakerStudio2/Cache/runtimes'
    };

    /** @type {{[key in NodeJS.Platform]: string}} */
    const platformMappings = {
        'win32': 'Windows',
        'darwin': 'Mac',
        'linux': 'Linux'
    };

    this.getDefaultRuntimesPath = () => 
        defaultRuntimePaths[process.platform];

    /**
     * @param {string} [path]
     */
    this.getAllRuntimes = (path) => {
        const runtimes_path = path ?? this.getDefaultRuntimesPath();

        if (runtimes_path === undefined) {
            throw 'Platform unsupported! Please provide the runtimes path manually';
        }
        
        if (!Electron_FS.existsSync(runtimes_path)) {
            throw `Runtimes path ${runtimes_path} doesn't exist`;
        }

        return Electron_FS.readdirSync(runtimes_path);
    }

    /**
     * @param {string} runtime_path
     */
    const getIgorPath = (runtime_path) => {
        switch (process.platform) {
            case 'win32': return `${runtime_path}\\bin\\igor\\windows\\x86\\Igor.exe`;
            case 'darwin': return `${runtime_path}/bin/igor/osx/${process.arch === 'x64' ? 'x86' : 'arm64' }/Igor`;
            default: throw 'Platform unsupported, sorry!'; // TODO: allow user to specify totally custom location.
        }
    }
   
    /**
     * @param {GMLProject} project
     * @param {string} runtime_path
     * @param {GMConstructorCompileSettings} settings
     */
    const compile = async (project, runtime_path, settings) => {
        const igor_path = getIgorPath(runtime_path);

        if (!Electron_FS.existsSync(igor_path)) {
            throw `Failed to find Igor at ${igor_path}`;
        }

        let log = '';

        const proc = spawn(igor_path, [
            `/project=${project.path}`,
            `/config=${project.config}`,
            `/rp=${runtime_path}`,
            `/cache=${project.dir}/cache`,
            `/of=${project.dir}/output`,
            platformMappings[process.platform], settings.launch ? 'Run' : 'Package' // TODO: we'll split this stuff out so its cmd-independent
        ]);

        // TODO: log properly
        proc.stdout.on('data', (data) => {
            log += data.toString();
            console.log(data.toString());
        });

        proc.stderr.on('data', (data) => {
            log += data.toString();
            console.log(data.toString());
        });

    }

    /**
     * @param {string} runtime_path
     * @param {boolean} launch
     */
    this.compileCurrentProject = async (runtime_path, launch) => {
        const proj = $gmedit['gml.Project'].current;
        await compile(proj, runtime_path, {
            launch
        })
    }

}
