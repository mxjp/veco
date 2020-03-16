import * as path from "path";
import * as ts from "typescript";
import { promises as fs } from "fs";
import { parse } from "json5";
import createTester, { Tester } from "anymatch";
import { ArgumentSpec } from "@phylum/command";
import { isNumber } from "util";

export interface Config {
	cwd: string,
	filename: string,
	compilerOptions: CompilerOptions,
	sourceTester: Tester;
	include: string[],
	includeTester: Tester;
	exclude: string[],
	excludeTester: Tester;
	target: RenderTarget;
	quality: number;
	scale: number;
	format: SvgFormat;
	preview: PreviewConfig;
	optimize: boolean;
}

export function isSource(config: Config, filename: string) {
	if (path.isAbsolute(filename)) {
		filename = path.relative(config.cwd, filename);
	}
	return config.sourceTester(filename) && config.includeTester(filename) && !config.excludeTester(filename);
}

export function getOutputFromSource(config: Config, filename: string) {
	return path.join(config.compilerOptions.outDir, path.relative(config.compilerOptions.rootDir, filename)).replace(/\.tsx?$/, ".js");
}

export interface CompilerOptions extends ts.CompilerOptions {
	rootDir: string;
	outDir: string;
}

export enum RenderTarget {
	xml = "xml",
	dom = "dom",
	png = "png",
	jpeg = "jpeg"
}

const RENDER_TARGETS = new Set<RenderTarget>([
	RenderTarget.xml,
	RenderTarget.dom,
	RenderTarget.png,
	RenderTarget.jpeg
]);

export interface SvgFormat {
	indent: string;
	newline: string;
}

export interface PreviewConfig {
	port: number;
	address: string;
}

export const RENDER_CONFIG_ARG_SPECS: ArgumentSpec[] = [
	{ name: "include", multiple: true },
	{ name: "exclude", multiple: true },
	{ name: "out-dir" },
	{ name: "target" },
	{ name: "quality", type: "number" },
	{ name: "scale", type: "number" }
];

export const PREVIEW_CONFIG_ARG_SPECS: ArgumentSpec[] = [
	{ name: "preview-port", type: "number" },
	{ name: "preview-address" },
	{ name: "include", multiple: true },
	{ name: "exclude", multiple: true }
];

export function applyConfigArgs(config: Config, args: any) {
	if (args["preview-port"]) {
		config.preview.port = args["preview-port"];
	}
	if (args["preview-address"]) {
		config.preview.address = args["preview-address"];
	}
	if (args.include) {
		config.includeTester = createTester(config.include = args.include);
	}
	if (args.exclude) {
		config.excludeTester = createTester(config.exclude = args.exclude);
	}
	if (args["out-dir"]) {
		config.compilerOptions.outDir = path.resolve(args["out-dir"]);
	}
	if (args.target) {
		if (!RENDER_TARGETS.has(args.target)) {
			throw new TypeError(`--target must be one of: ${Array.from(RENDER_TARGETS).join(", ")}`);
		}
		config.target = args.target;
	}
	if (args.quality !== undefined) {
		if (args.quality <= 0 || args.quality > 1) {
			throw new TypeError(`--quality must be a number greater than 0 and smaller or equal to 1.`);
		}
		config.quality = args.quality;
	}
	if (args.scale !== undefined) {
		if (args.scale <= 0) {
			throw new TypeError(`--scale must be a number greater than 0.`);
		}
		config.scale = args.scale;
	}
}

export async function readConfigFile(filename?: string): Promise<Config> {
	// TODO: Improve ts error handling and diagnostics.

	let json: any;
	let fileExists = true;
	if (filename) {
		filename = path.resolve(filename);
		json = parse(await fs.readFile(filename, "utf8"));
	} else {
		filename = path.resolve("veco.json5");
		json = parse(await fs.readFile(filename, "utf8").catch(error => {
			if (error && error.code === "ENOENT") {
				fileExists = false;
				return "{}";
			}
			throw error;
		}));
	}
	const cwd = path.dirname(filename);

	const jsonCompilerOptions = json.compilerOptions || {};
	if (!jsonCompilerOptions.rootDir) {
		jsonCompilerOptions.rootDir = ".";
	}
	if (!jsonCompilerOptions.outDir) {
		jsonCompilerOptions.outDir = ".";
	}

	const convertedCompilerOptions = ts.convertCompilerOptionsFromJson(jsonCompilerOptions, cwd, fileExists ? filename : undefined);
	if (convertedCompilerOptions.errors.length > 0) {
		throw convertedCompilerOptions.errors;
	}

	const compilerOptions = <CompilerOptions> Object.assign(<ts.CompilerOptions> {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2019,
		jsx: ts.JsxEmit.React,
		jsxFactory: "render",
		strict: true
	}, convertedCompilerOptions.options);

	if (compilerOptions.module !== ts.ModuleKind.CommonJS) {
		throw new TypeError(`compilerOptions.module must be "CommonJS".`);
	}
	if (compilerOptions.jsx !== ts.JsxEmit.React) {
		throw new TypeError(`compilerOptions.jsx must be "React".`);
	}

	const sourceTester = createTester(["**/*.ts", "**/*.tsx"]);

	const include = json.include || ["**"];
	const includeTester = createTester(include);

	const exclude = json.exclude || ["**/node_modules/**"];
	const excludeTester = createTester(exclude);

	const target = json.target || "xml";
	if (!RENDER_TARGETS.has(target)) {
		throw new TypeError(`target must be one of: ${Array.from(RENDER_TARGETS).join(", ")}`);
	}

	const quality = json.quality === undefined ? 1 : json.quality;
	if (!isNumber(quality) || quality <= 0 || quality > 1) {
		throw new TypeError(`quality must be a number greater than 0 and smaller or equal to 1.`);
	}

	const scale = json.scale === undefined ? 1 : json.scale;
	if (!isNumber(scale) || scale <= 0) {
		throw new TypeError(`scale must be a number greater than 0.`);
	}

	const jsonFormat = json.format || {};
	const formatIndent = jsonFormat.indent === undefined ? "\t" : jsonFormat.indent;
	const formatNewline = jsonFormat.newline === undefined ? "\n" : jsonFormat.newline;

	const jsonPreview = json.preview || {};
	const previewPort = jsonPreview.port || 3000;
	const previewAddress = jsonPreview.address || "::1";

	const optimize = json.optimize === undefined ? true : json.optimize;
	if (typeof optimize !== "boolean") {
		throw new TypeError(`optimize must be a boolean.`);
	}

	return {
		cwd,
		filename,
		compilerOptions,
		sourceTester,
		include,
		includeTester,
		exclude,
		excludeTester,
		target,
		quality,
		scale,
		format: {
			indent: formatIndent,
			newline: formatNewline
		},
		preview: {
			port: previewPort,
			address: previewAddress
		},
		optimize
	};
}
