const PATH = require('path');

module.exports = {
	entry: './Source/Core/Index.ts',
	devtool: 'source-map',
	mode: 'development',
	watch: true,
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
	watchOptions: {
		ignored: [ 'node_modules']
	},
	stats: {
		warnings: true,
		errors: true,
		errorDetails: true,
		moduleTrace: true
	}
};
