
import * as child_process from 'node:child_process';
import { GMRTController } from '../gmrt/GMRTController.js';

const GMRT_PATH = 'C:\\Users\\orca\\gmpm\\GMRT\\Release\\bin\\gmrt.exe';
const PROJECT_YYP_PATH = 'C:\\Users\\orca\\Documents\\GameMakerStudio2\\gmedit-constructor-sandbox\\gmedit-constructor-sandbox.yyp';

// const PROJECT_PATH = 'C:\\Users\\orca\\Documents\\GameMakerStudio2\\gmedit-constructor-sandbox';

// const COMMAND = `"C:\Users\orca\gmpm\GMRT\Release\bin\gmrt.exe"
// 	"C:\Users\orca\Documents\GameMakerStudio2\gmedit-constructor-sandbox\gmedit-constructor-sandbox.yyp"
// 	-o "C:\Users\orca\Documents\GameMakerStudio2\gmedit-constructor-sandbox\Build"
// 	-bg="C:\Users\orca\gmpm\GMRT\Release\bin\targets\buildgraph-win64-prod.xml"
// 	-bj="Build-interpreter-windows-x64;Run-windows-x64"
// 	-v
// 	--build-type=Release
// 	--script-build-type=Debug
// 	--cache-dir="C:\Users\orca\Documents\GameMaker\Cache"
// `;

/** @type {GMRT.CliArgs} */
const cliArgs = {
	inputFiles: [PROJECT_YYP_PATH],
	buildGraphPath: 'C:\\Users\\orca\\gmpm\\GMRT\\Release\\bin\\targets\\buildgraph-win64-prod.xml',
	buildGraphJobIds: ['Build-interpreter-windows-x64', 'Run-windows-x64'],
	outputDirectory: 'C:\\Users\\orca\\Documents\\GameMakerStudio2\\gmedit-constructor-sandbox\\Build',
	verbosity: 'verbose',
	buildType: 'Release'
};

/** @type {string[]} */
const gmrtArgsArray = [
	...cliArgs.inputFiles,
	'--output', cliArgs.outputDirectory,
	'--build-graph', cliArgs.buildGraphPath,
	'--build-jobs', cliArgs.buildGraphJobIds.join(';'),
	'--build-type', cliArgs.buildType
];

if (cliArgs.parallelJobs !== undefined) {
	gmrtArgsArray.push('--jobs', cliArgs.parallelJobs.toString());
}

switch (cliArgs.verbosity ?? 'normal') {
	case 'verbose': gmrtArgsArray.push('-v'); break;
	case 'very-verbose': gmrtArgsArray.push('-vv'); break;
	case 'normal': break;
}

/** @type {import('node:child_process').SpawnOptionsWithoutStdio} */
const spawnOptions = { detached: (process.platform !== 'win32') };

console.info(`${GMRT_PATH} ${gmrtArgsArray.join(' ')}`);

const proc = child_process.spawn(GMRT_PATH, gmrtArgsArray, spawnOptions);
proc.stdout.on('data', (chunk) => String(chunk).split('\n').forEach(line => console.log(`OUT: ${line}`)));
proc.stderr.on('data', (chunk) => String(chunk).split('\n').forEach(line => console.log(`ERROR: ${line}`)));

await new Promise((resolve) => proc.on('exit', resolve));
console.info('Done!');
