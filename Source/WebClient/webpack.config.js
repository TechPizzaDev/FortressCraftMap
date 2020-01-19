const PATH = require('path');
const FS = require('fs');
const CHILD_PROCESS = require('child_process');

const fcmapSpeedyPath = PATH.resolve(__dirname, "..", "fcmap-speedy");

//#region Webpack Settings

const isProduction = false;

const packPath = "Webpack/";
const packDirectoryPath = "Public/" + packPath;

const packMain = './Source/Core/Index.ts';
const packBootstrap = [
	'./Source/Content/ContentRegistry.ts',
	'./Source/Content/ContentLoadingInfo.ts'
];

//#endregion

//#region wasmCleanupPlugin

function wasmCleanupPlugin(compilation) {
	const stats = compilation.getStats();
	const compilationStats = stats.compilation;
	const outputOptions = compilationStats.outputOptions;

	// remove files that were not in this compilation,
	// most often being files that have a dynamic name
	const filesToRemove = FS.readdirSync(outputOptions.path);

	for (const [assetName] of compilationStats.assetsInfo) {
		for (let i = 0; i < filesToRemove.length; i++) {
			if (filesToRemove[i].includes(assetName)) {
				filesToRemove.splice(i, 1);
				break;
			}
		}
	}

	for (const oldFile of filesToRemove) {
		try {
			const path = PATH.resolve(outputOptions.path, oldFile);
			FS.unlinkSync(path);
			console.log(`Removed stale file: \"${oldFile}\"`);
		} catch (err) {
			console.error(err);
		}
	}
}

//#endregion

//#region wasmPackRebuildPlugin

const wasmPackProgram = "wasm-pack";

const CReset = "\x1b[0m";
const CRed = "\x1b[31m";
const CGreen = "\x1b[32m";
const CYellow = "\x1b[1m";
const CGreenB = "\x1b[42m";

function wasmPackRebuildPlugin(compilation) {
	const successFormat = `${CGreenB}%s${CReset}${CGreen}%s${CReset}`;
	const failFormat = `${CGreenB}%s${CReset}${CRed}%s${CReset}`;

	function endCallback(error, stdout, stderr) {
		const endTime = Date.now();
		const timeInMs = endTime - startTime;

		const finishFormat = error ? failFormat : successFormat;
		const state = error ? "failed" : "finished";
		console.log(finishFormat, wasmPackProgram, ` ${state} in ${timeInMs}ms`);

		if (error) {
			console.error(`${CYellow}%s${CReset}`, error.message);
		}
		else {
			if (stdout && stdout.length > 0) console.log(`${wasmPackProgram} stdout: ${stdout}`);
			if (stderr && stderr.length > 0) console.log(`${wasmPackProgram} output: \n${stderr}`);
		}
		console.log();
	}

	console.log(successFormat, wasmPackProgram, " is starting...");

	const command = `${wasmPackProgram} build`;
	const settings = {
		cwd: fcmapSpeedyPath,
		timeout: 30 * 1000
	};

	const startTime = Date.now();
	let buffer;
	buffer = CHILD_PROCESS.execSync(command, settings);
	endCallback(null, buffer, null);
}

//#endregion

const webpackConfigBase = {
	entry: {
		bootstrap: packBootstrap,
		main: packMain
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js'],
		modules: [
			'node_modules',
			fcmapSpeedyPath
		]
	},
	output: {
		chunkFilename: '[name].js',
		filename: '[name].js',
		publicPath: packPath,
		path: PATH.resolve(__dirname, packDirectoryPath)
	},
	stats: {
		warnings: true,
		errors: true,
		errorDetails: true,
		moduleTrace: true
	},
	watch: true,
	watchOptions: {
		ignored: [
			'node_modules',
			packDirectoryPath,
			PATH.resolve(fcmapSpeedyPath, "**/*.rs")
		],
		aggregateTimeout: 100
	},
	optimization: {
		namedChunks: true,
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				dependencies: {
					test: /[\\/]node_modules[\\/]/i,
					chunks: "all",
					filename: "dependencies.js"
				}
			}
		}
	} /*, plugins: [
		// ... other plugins here ...
		{
			apply: (compiler) => {
				compiler.hooks.emit.tap("WasmCleanupPlugin", wasmCleanupPlugin);
				compiler.hooks.watchRun.tap("WasmPackRebuildPlugin", wasmPackRebuildPlugin);
			}
		}
	] */
};

function getConfigBaseCopy() {
	return Object.assign({}, webpackConfigBase);
}

function getConfigExport() {
	if (isProduction)
		return Object.assign(getConfigBaseCopy(), {
			devtool: 'source-map',
			mode: 'production'
		});
	else
		return Object.assign(getConfigBaseCopy(), {
			devtool: 'source-map',
			mode: 'development'
		});
}

module.exports = getConfigExport();