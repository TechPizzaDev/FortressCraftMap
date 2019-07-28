const PATH = require('path');

const isProduction = false;

const webpackConfigBase = {
	entry: './Source/Core/Index.ts',
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
				PATH.resolve(__dirname, 'node_modules')
			]
	},
	output: {
		filename: 'bundle.js',
		path: PATH.resolve(__dirname, 'Public')
	},
	stats: {
		warnings: true,
		errors: true,
		errorDetails: true,
		moduleTrace: true
	},
	watch: true,
	watchOptions: {
		ignored: ['node_modules']
	},
};

function getBaseCopy() {
	return Object.assign({}, webpackConfigBase);
}

function getConfigExport() {
	if (isProduction)
		return Object.assign(getBaseCopy(), {
			devtool: 'source-map',
			mode: 'production'
		});
	else
		return Object.assign(getBaseCopy(), {
			devtool: 'cheap-module-eval-source-map',
			mode: 'development'
		});
}

module.exports = getConfigExport();