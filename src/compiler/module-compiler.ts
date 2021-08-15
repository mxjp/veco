import path from "path";
import ts from "typescript";
import walk from "klaw-sync";
import { watch } from "chokidar";
import { AsyncDisposable } from "../common/disposable";
import { Emitter, Event } from "../common/emitter";
import { Config, isSource, getOutputFromSource } from "./config";
import { Log } from "../common/logging";

export interface ModuleCompilerDeleteEvent {
	readonly moduleFilename: string;
}

export interface ModuleCompilerDoneEvent {
	readonly diagnostics: ts.Diagnostic[];
}

export class ModuleCompiler extends Emitter<{
	watcherError: Event<[any]>,
	watchRuntimeError: Event<[any]>,
	file: Event<[string, string]>,
	delete: Event<[ModuleCompilerDeleteEvent]>,
	done: Event<[ModuleCompilerDoneEvent]>
}> {
	public constructor(public readonly config: Config, public readonly log: Log) {
		super();
	}

	public async run() {
		const rootNames = walk(this.config.cwd, {
			filter: item => isSource(this.config, item.path),
			nodir: true,
			traverseAll: true
		}).map(item => item.path);

		const host = ts.createCompilerHost(this.config.compilerOptions);
		host.writeFile = this._emitFile.bind(this);

		const program = ts.createProgram({ options: this.config.compilerOptions, rootNames, host });
		const result = program.emit();
		this.emit("done", this._createResult(result, program));
	}

	public watch(): AsyncDisposable {
		const host = ts.createIncrementalCompilerHost(this.config.compilerOptions);
		host.writeFile = this._emitFile.bind(this);

		const rootNames = new Set<string>();

		let program: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

		function run(this: ModuleCompiler) {
			// TODO: Debounce runs.
			program = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
				Array.from(rootNames),
				this.config.compilerOptions,
				host,
				program
			);
			const result = program.emit();
			this.emit("done", this._createResult(result, program.getProgram()));
		}

		const watcher = watch(this.config.include, {
			cwd: this.config.cwd,
			awaitWriteFinish: {
				pollInterval: 100,
				stabilityThreshold: 200
			}
		});

		watcher.on("add", name => {
			if (isSource(this.config, name)) {
				rootNames.add(path.join(this.config.cwd, name));
				if (program !== undefined) {
					try {
						run.call(this);
					} catch (error) {
						this.emit("watchRuntimeError", error);
					}
				}
			}
		});

		watcher.on("unlink", name => {
			const filename = path.join(this.config.cwd, name);
			if (isSource(this.config, filename)) {
				rootNames.delete(filename);
				this.emit("delete", { moduleFilename: getOutputFromSource(this.config, filename) });
			}
		});

		watcher.on("ready", () => {
			try {
				run.call(this);
			} catch (error) {
				this.emit("watchRuntimeError", error);
			}
		});

		watcher.on("change", name => {
			if (program !== undefined && isSource(this.config, name)) {
				try {
					run.call(this);
				} catch (error) {
					this.emit("watchRuntimeError", error);
				}
			}
		});

		watcher.on("error", error => this.emit("watcherError", error));

		return () => watcher.close();
	}

	private _createResult(emitResult: ts.EmitResult, program: ts.Program): ModuleCompilerDoneEvent {
		return {
			diagnostics: [
				...ts.getPreEmitDiagnostics(program),
				...emitResult.diagnostics
			]
		};
	}

	private _emitFile(filename: string, data: string) {
		this.emit("file", path.normalize(filename), data);
	}
}
