import { ModuleCompilerOutput } from "./module-compiler";

/**
 * The svg builder is used as compiler output to
 * run compiled modules and emit svg instances.
 */
export class SvgBuilder implements ModuleCompilerOutput {
	public emit(filename: string, data: string) {
		// TODO: Store compiled module code.
		// TODO: Invalidate affected modules.
		throw new Error("not implemented");
	}

	public done(): void {
		// TODO: Run compiled modules in memory and emit svgs.
		throw new Error("not implemented");
	}
}
