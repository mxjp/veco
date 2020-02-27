
declare namespace VECO {
	export interface Runtime {
		render(...args: any): any;
	}
}

declare const runtime: VECO.Runtime;

declare namespace JSX {
	export interface IntrinsicElements {
		[name: string]: any;
	}
}
