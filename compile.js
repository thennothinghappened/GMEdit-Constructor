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
            case 'darwin': return `${runtime_path}/bin/igor/osx/${process.arch === 'x64' ? 'x86' : 'arm64' }`;
            default: throw 'Platform unsupported, sorry!'; // TODO: allow user to specify totally custom location.
        }
    }
   
    /**
     * @param {GMLProject} project
     * @param {string} igor_path
     */
    const compile = async (project, igor_path) => {
    
    }

    /**
     * @param {GMLProject} project
     * @param {string} igor_path
     */
    const run = async (project, igor_path) => {
        
        const bin = await compile(project, igor_path);
        

    }

}
