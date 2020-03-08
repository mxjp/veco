import { Element } from "./element";

export function emit(element: Element, name?: string): void {
	throw new Error("emit can only be used from veco modules.");
	// This function is implemented at runtime specific to the dependant
	// module to emit svgs at the corresponding output path.
	// See "compiler/runtime-module/_runtimeEmit(..)"
}
