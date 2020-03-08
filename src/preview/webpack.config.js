"use strict";

const path = require("path");
const { DefinePlugin } = require("webpack");
const HtmlPlugin = require("html-webpack-plugin");

exports.default = ({ prod } = {}) => {
	const context = path.join(__dirname, "../..");
	return {
		context,
		mode: prod ? "production" : "development",
		entry: path.join(__dirname, "index.tsx"),
		devtool: prod ? "source-map" : "inline-source-map",
		resolve: {
			extensions: [".ts", ".tsx", ".js", ".json"]
		},
		module: {
			rules: [
				{ test: /\.tsx?$/, use: "ts-loader" },
				{ test: /\.s[ac]ss$/, use: [
					"style-loader",
					{ loader: "css-loader", options: {
						modules: true,
						esModule: true
					} },
					{ loader: "sass-loader", options: {
						implementation: require("sass")
					} }
				] }
			]
		},
		plugins: [
			new HtmlPlugin({
				template: "./src/preview/index.html",
				inject: "head"
			}),
			...(process.env.WEBPACK_DEV_SERVER ? [
				new DefinePlugin({ "process.env.VECO_DEV_API": true })
			] : [
				new DefinePlugin({ "process.env.VECO_DEV_API": false })
			])
		],
		output: {
			path: path.join(context, "dist/preview"),
			filename: "[name]-[hash].js"
		},
		devServer: {
			hot: true
		}
	};
};
