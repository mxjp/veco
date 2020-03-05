
declare namespace VecoRuntime {
	export interface Element {
		tagName: string;
		props: Record<string, any>;
		children: any[];
	}
}

declare function render(tagName: string, props?: Record<string, any>, ...children: any[]): VecoRuntime.Element;
declare function emit(element: VecoRuntime.Element, name?: string): void;

declare namespace JSX {
	interface IntrinsicElements {
		[name: string]: any;
	}
}
