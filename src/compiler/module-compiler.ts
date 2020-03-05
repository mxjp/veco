import * as path from "path";
import * as ts from "typescript";
import createTester, { Tester } from "anymatch";
import * as isGlob from "is-glob";
import * as walk from "klaw-sync";
import { watch } from "chokidar";
import { Emitter, Event } from "../common/emitter";
import { AsyncDisposable } from "../common/disposable";
import { FileEmitter } from "./file-emitter";

/**
 * The module compiler takes a tsconfig and compiles
 * all included .ts/tsx files to .veco modules and
 * declaration files if enabled.
 */
export class ModuleCompiler extends Emitter<{
	watcherError: Event<[any]>,
	file: Event<[string, string]>,
	done: Event<[ModuleCompilerResult]>
}> implements FileEmitter {
	public constructor(options: ModuleCompilerOptions) {
		super();
		this._cwd = path.resolve(options.cwd || ".");

		// TODO: Move compiler options defaults and validation to config loader:
		this._tsCompilerOptions = Object.assign(<ts.CompilerOptions> {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2019,
			jsx: ts.JsxEmit.React,
			jsxFactory: "render",
			strict: true
		}, options.tsCompilerOptions);
		if (this._tsCompilerOptions.module !== ts.ModuleKind.CommonJS) {
			throw new ModuleCompilerTsOptionsError("module", "CommonJS");
		}
		if (this._tsCompilerOptions.jsx !== ts.JsxEmit.React) {
			throw new ModuleCompilerTsOptionsError("jsx", "React");
		}
		this._includeGlobs = resolveGlobs(options.include, ["**"]);
		this._include = createTester(this._includeGlobs);
		this._exclude = createTester(resolveGlobs(options.exclude, []));
	}

	private readonly _cwd: string;
	private readonly _tsCompilerOptions: ts.CompilerOptions;
	private readonly _relevantSources = createTester(["**/*.ts", "**/*.tsx"]);
	private readonly _includeGlobs: string[];
	private readonly _include: Tester;
	private readonly _exclude: Tester;

	public run() {
		const rootNames = [
			...this._internalRootNames,
			...walk(this._cwd, {
				filter: item => {
					const name = path.relative(this._cwd, item.path);
					return this._isRootName(name);
				},
				nodir: true,
				traverseAll: true
			}).map(item => item.path)
		];

		const tsHost = ts.createCompilerHost(this._tsCompilerOptions);
		tsHost.writeFile = this._emitFromTsCompiler.bind(this);

		const tsProgram = ts.createProgram({
			options: this._tsCompilerOptions,
			rootNames,
			host: tsHost
		});

		const tsResult = tsProgram.emit();
		this.emit("done", this._getResult(tsResult, tsProgram));
	}

	public watch(): AsyncDisposable {
		const watcher = watch(this._includeGlobs, {
			cwd: this._cwd,
			awaitWriteFinish: {
				pollInterval: 100,
				stabilityThreshold: 200
			}
		});

		const tsHost = ts.createIncrementalCompilerHost(this._tsCompilerOptions);
		tsHost.writeFile = this._emitFromTsCompiler.bind(this);

		const rootNames = new Set<string>();

		let tsProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined = undefined;

		function run(this: ModuleCompiler) {
			// TODO: Debounce runs.
			tsProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram([
				...this._internalRootNames,
				...rootNames
			], this._tsCompilerOptions, tsHost, tsProgram);
			const tsResult = tsProgram.emit();
			this.emit("done", this._getResult(tsResult, tsProgram.getProgram()));
		}

		watcher.on("add", name => {
			if (this._isRootName(name)) {
				rootNames.add(path.join(this._cwd, name));
				if (tsProgram !== undefined) {
					run.call(this);
				}
			}
		});

		watcher.on("unlink", name => {
			if (this._isRootName(name)) {
				rootNames.delete(path.join(this._cwd, name));
				if (tsProgram !== undefined) {
					run.call(this);
				}
			}
			// TODO: Emit a deleted event for the corresponding output path before the next "done" event is emitted.
		});

		watcher.on("change", name => {
			if (tsProgram !== undefined && this._isRootName(name)) {
				run.call(this);
			}
		});

		watcher.on("ready", () => {
			run.call(this);
		});

		watcher.on("error", error => {
			this.emit("watcherError", error);
		});

		return () => watcher.close();
	}

	private readonly _internalRootNames = [
		path.join(__dirname, "../../runtime.d.ts")
	];

	private _isRootName(name: string) {
		return this._relevantSources(name) && this._include(name) && !this._exclude(name);
	}

	private _emitFromTsCompiler(filename: string, data: string) {
		filename = path.normalize(filename);
		filename = filename.replace(/\.js$/i, ".veco");
		this.emit("file", filename, data);
	}

	private _getResult(tsResult: ts.EmitResult, tsProgram: ts.Program): ModuleCompilerResult {
		return {
			tsDiagnostics: [
				...ts.getPreEmitDiagnostics(tsProgram),
				...tsResult.diagnostics
			]
		};
	}
}

export interface ModuleCompilerOptions {
	readonly cwd?: string;
	readonly tsCompilerOptions?: ts.CompilerOptions;
	readonly include?: string[];
	readonly exclude?: string[];
}

export interface ModuleCompilerResult {
	tsDiagnostics: ts.Diagnostic[];
}

export class ModuleCompilerTsOptionsError extends TypeError {
	public constructor(
		public readonly field: string,
		public readonly expected: string
	) {
		super(`compilerOptions.${field} must be set to "${expected}".`);
	}
}

function resolveGlobs(globs: string[] | undefined, defaultValue: string[]) {
	return globs
		? globs.map(glob => isGlob(glob) ? glob : glob.replace(/\/?$/, "/**"))
		: defaultValue;
}
