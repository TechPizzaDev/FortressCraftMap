const PATH = require('path');

module.exports = {
	entry: './Core/Index.ts',
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
		path: PATH.resolve(__dirname, '../../WebRoot')
	},
	watchOptions: {
		ignored: [ 'node_modules']
	},
	stats: {
		errors: true,
		errorDetails: true,
		warnings: true
	}
};
