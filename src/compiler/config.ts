import * as path from "path";
import * as ts from "typescript";
import { promises as fs } from "fs";
import { parse } from "json5";
import createTester, { Tester } from "anymatch";
import { ArgumentSpec } from "@phylum/command";

export interface Config {
	cwd: string,
	filename: string,
	compilerOptions: CompilerOptions,
	sourceTester: Tester;
	include: string[],
	includeTester: Tester;
	exclude: string[],
	excludeTester: Tester;
	target: SvgTarget;
	format: SvgFormat;
	preview: PreviewConfig;
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

export enum SvgTarget {
	xml = "xml",
	dom = "dom"
}

const SVG_TARGETS = new Set<SvgTarget>([SvgTarget.xml, SvgTarget.dom]);

export interface SvgFormat {
	indent: string;
	newline: string;
}

export interface PreviewConfig {
	port: number;
	address: string;
}

export const PREVIEW_CONFIG_ARG_SPECS: ArgumentSpec[] = [
	{ name: "preview-port", type: "number" },
	{ name: "preview-address" }
];

export function applyConfigArgs(config: Config, args: any) {
	if (args["preview-port"]) {
		config.preview.port = args["preview-port"];
	}
	if (args["preview-address"]) {
		config.preview.address = args["preview-address"];
	}
}

export async function readConfigFile(filename?: string): Promise<Config> {
	// TODO: Improve ts error handling and diagnostics.
	// TODO: Add validation.

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

	const exclude = json.exclude || [];
	const excludeTester = createTester(exclude);

	const target = json.target || "xml";
	if (!SVG_TARGETS.has(target)) {
		throw new TypeError(`target must be "xml" or "dom".`);
	}

	const jsonFormat = json.format || {};
	const formatIndent = jsonFormat.indent === undefined ? "\t" : jsonFormat.indent;
	const formatNewline = jsonFormat.newline === undefined ? "\n" : jsonFormat.newline;

	const jsonPreview = json.preview || {};
	const previewPort = jsonPreview.port || 3000;
	const previewAddress = jsonPreview.address || "::1";

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
		format: {
			indent: formatIndent,
			newline: formatNewline
		},
		preview: {
			port: previewPort,
			address: previewAddress
		}
	};
}
