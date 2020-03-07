"use strict";

const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");

exports.default = ({ prod } = {}) => {
	const context = path.join(__dirname, "../..");
	return {
		context,
		mode: prod ? "production" : "development",
		entry: path.join(__dirname, "index.tsx"),
		devtool: prod ? "source-map" : "inline-source-map",
		module: {
			rules: [
				{ test: /\.tsx?$/, use: "ts-loader" }
			]
		},
		plugins: [
			new HtmlPlugin({
				template: "./src/preview/index.html",
				inject: "body"
			})
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
