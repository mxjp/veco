import * as path from "path";
import * as ts from "typescript";
import { Runtime, Element } from "./runtime";

export interface CompilerOptions {
	readonly cwd?: string;
	readonly tsCompilerOptions?: ts.CompilerOptions;
}

export interface CompileTask {
	readonly input: string;
	readonly output: string;
}

interface NormalizedTask {
	readonly input: string;
	readonly output: string;
	readonly module: string;
}

export class Compiler {
	public constructor(options: CompilerOptions = {}) {
		this._cwd = path.resolve(options.cwd || ".");
		this._tsCompilerOptions = Object.assign(<ts.CompilerOptions> {
			target: ts.ScriptTarget.ES2019,
			strict: true,
			rootDir: ".",
			outDir: "./veco_out"
		}, options.tsCompilerOptions, <ts.CompilerOptions> {
			declaration: false,
			moduleResolution: ts.ModuleResolutionKind.Classic,
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.React,
			jsxFactory: "runtime.render"
		});
		this._tsCompilerOptions.rootDir = path.resolve(this._cwd, this._tsCompilerOptions.rootDir!);
		this._tsCompilerOptions.outDir = path.resolve(this._cwd, this._tsCompilerOptions.outDir!);

		this._tsCompilerOptions.module = ts.ModuleKind.CommonJS;
		this._tsCompilerHost = ts.createCompilerHost(this._tsCompilerOptions);
		this._tsCompilerHost.writeFile = (filename, data) => {
			this._files.set(path.normalize(filename), data);
		};
	}

	private readonly _cwd: string;
	private readonly _tsCompilerOptions: ts.CompilerOptions;
	private readonly _tsCompilerHost: ts.CompilerHost;

	/** Map of absolute filenames to compiled content that is used during compilation. */
	private readonly _files = new Map<string, string>();

	public compile(tasks: CompileTask[]) {
		const normalizedTasks = tasks.map(task => {
			const input = path.resolve(this._cwd, task.input);
			return <NormalizedTask> {
				input,
				output: path.resolve(this._cwd, task.output),
				module: path.join(this._tsCompilerOptions.outDir!, path.relative(this._tsCompilerOptions.rootDir!, path.dirname(input)), path.basename(input, path.extname(input)) + ".js")
			};
		});

		this._files.clear();

		const program = ts.createProgram({
			rootNames: [
				path.join(__dirname, "../types/runtime.d.ts"),
				...normalizedTasks.map(t => t.input)
			],
			options: this._tsCompilerOptions,
			host: this._tsCompilerHost
		});

		const result = program.emit();

		const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
		for (const diagnostic of diagnostics) {
			if (diagnostic.file) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
				console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
			} else {
				console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
			}
		}

		const runtime = new Runtime({
			files: this._files
		});

		for (const task of normalizedTasks) {
			const exports = runtime.require(task.module);
			const element: Element = exports.default;
			if (!(element instanceof Element)) {
				throw new Error(`Module ${task.input} does not export an element to render.`);
			}
			const svg = element.render();
			console.log("Svg output:", svg);
		}
	}
}

// Experimental compilation:
const compiler = new Compiler();

compiler.compile([
	{ input: "./test/icon.tsx", output: "./test/icon.svg" }
]);
