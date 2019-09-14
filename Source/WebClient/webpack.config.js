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
			PATH.resolve(__dirname, 'node_modules'),
			PATH.resolve(__dirname, "..", "fortresscraftmap-speedy")
		]
	},
	output: {
		filename: 'runtime.js',
		chunkFilename: '[name].js',
		publicPath: "/Script/",
		path: PATH.resolve(__dirname, 'Public/Script')
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
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendors: {
					test: /[\\/]node_modules[\\/]/i,
					chunks: "all"
				},
				commons: {
					name: "commons",
					chunks: "initial",
					minChunks: 2
				}
			}
		},
		runtimeChunk: {
			name: "runtime"
		}
	}
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