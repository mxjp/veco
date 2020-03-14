import { Element } from "./element";

export function render(
	tagName: string,
	props?: Record<string, any> | null,
	...children: any[]
) {
	return new Element(
		tagName,
		props || {},
		children.flat(Infinity).map(value => {
			return value instanceof Element ? value : String(value);
		})
	);
}
