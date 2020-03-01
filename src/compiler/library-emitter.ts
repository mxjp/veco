import { ModuleCompilerOutput } from "./module-compiler";

/**
 * The library emitter is used to write raw compiled code to disk.
 */
export class LibraryEmitter implements ModuleCompilerOutput {
	public emit(filename: string, data: string) {
		// TODO: Write file to disk.
		throw new Error("not implemented");
	}
}
