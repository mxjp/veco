import { Disposable } from "../common/disposable";

/**
 * The module compiler takes a tsconfig and compiles
 * all included .ts/tsx files to .veco modules.
 */
export class ModuleCompiler {
	public constructor(options: ModuleCompilerOptions) {
		this._output = options.output;
	}

	private readonly _output: ModuleCompilerOutput;

	public run() {
		throw new Error("not implemented");
	}

	public watch(): Disposable {
		throw new Error("not implemented");
	}
}

export interface ModuleCompilerOptions {
	readonly incremental?: boolean;
	readonly output: ModuleCompilerOutput;
}

export interface ModuleCompilerOutput {
	emit?(filename: string, data: string): void;
	done?(): void;
}
