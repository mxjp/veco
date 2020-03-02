import * as path from "path";
import * as ts from "typescript";
import { Disposable } from "../common/disposable";
import createTester, { Tester } from "anymatch";
import * as walk from "klaw-sync";

/**
 * The module compiler takes a tsconfig and compiles
 * all included .ts/tsx files to .veco modules and
 * declaration files if enabled.
 */
export class ModuleCompiler {
	public constructor(options: ModuleCompilerOptions) {
		this._cwd = path.resolve(options.cwd || ".");
		this._compilerOptions = Object.assign(<ts.CompilerOptions> {
			target: ts.ScriptTarget.ES2019,
			jsx: ts.JsxEmit.React,
			jsxFactory: "render",
			strict: true
		}, options.compilerOptions);
		this._compilerOptions.rootDir = path.resolve(this._compilerOptions.rootDir || ".");
		this._compilerOptions.outDir = path.resolve(this._compilerOptions.outDir || ".");
		if (this._compilerOptions.jsx !== ts.JsxEmit.React) {
			throw new ModuleCompilerTsOptionsError("jsx", "react");
		}
		if (this._compilerOptions.jsxFactory !== "render") {
			throw new ModuleCompilerTsOptionsError("jsxFactory", "render");
		}
		this._include = createTester(options.include || ["**"]);
		this._exclude = createTester(options.exclude || []);
		this._output = options.output;
	}

	private readonly _cwd: string;
	private readonly _compilerOptions: ts.CompilerOptions;
	private readonly _relevantSources = createTester(["**/*.ts", "**/*.tsx"]);
	private readonly _include: Tester;
	private readonly _exclude: Tester;
	private readonly _output: ModuleCompilerOutput;

	public run() {
		const rootNames = [
			path.join(__dirname, "../../runtime.d.ts"),
			...walk(this._cwd, {
				filter: item => {
					const name = path.relative(this._cwd, item.path);
					return this._relevantSources(name) && this._include(name) && !this._exclude(name);
				},
				nodir: true,
				traverseAll: true
			}).map(item => item.path)
		];

		const host = ts.createCompilerHost(this._compilerOptions);
		host.writeFile = (filename, data) => {
			this._output.emit(filename.replace(/\.js$/i, ".veco"), data);
		};

		const program = ts.createProgram({
			options: this._compilerOptions,
			rootNames,
			host
		});

		program.emit();

		if (this._output.done) {
			this._output.done();
		}
	}

	public watch(): Disposable {
		throw new Error("not implemented");
	}
}

export interface ModuleCompilerOptions {
	readonly cwd?: string;
	readonly compilerOptions?: ts.CompilerOptions;
	readonly include?: string[];
	readonly exclude?: string[];
	readonly output: ModuleCompilerOutput;
}

export interface ModuleCompilerOutput {
	emit(filename: string, data: string): void;
	done?(): void;
}

export class ModuleCompilerTsOptionsError extends TypeError {
	public constructor(
		public readonly field: string,
		public readonly expected: string
	) {
		super(`compilerOptions.${field} must be set to "${expected}".`);
	}
}
