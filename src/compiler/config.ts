import * as path from "path";
import * as ts from "typescript";
import { ModuleCompilerOptions } from "./module-compiler";
import { SvgBuilderOptions } from "./svg-builder";

export type Config = ModuleCompilerOptions & SvgBuilderOptions;

export function getConfig(searchPath = "."): Config {
	const tsconfigFilename = ts.findConfigFile(searchPath, ts.sys.fileExists);
	if (!tsconfigFilename) {
		throw new Error(`Config file not found: "${searchPath}"`);
	}

	const cwd = path.dirname(path.resolve(tsconfigFilename));
	const tsconfig = ts.readConfigFile(tsconfigFilename, ts.sys.readFile);
	if (tsconfig.error) {
		throw tsconfig.error;
	}

	const compilerOptions = ts.convertCompilerOptionsFromJson(tsconfig.config.compilerOptions, cwd);
	if (compilerOptions.errors.length > 0) {
		throw compilerOptions.errors;
	}

	// TODO: Support ts "extend" field.

	return {
		cwd,
		tsCompilerOptions: compilerOptions.options,
		include: tsconfig.config.include,
		exclude: tsconfig.config.exclude
	}
}
