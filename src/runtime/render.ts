import { Element } from "./element";

export function render(tagName: string, props?: Record<string, string> | null, ...children: any[]) {
	return new Element(tagName, props || {}, children);
}
