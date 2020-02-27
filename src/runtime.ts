import * as path from "path";
import { createContext, runInContext } from "vm";
import escape = require("escape-html");

export interface RuntimeOptions {
	readonly files: Map<string, string>;
}

export class Runtime {
	public constructor(options: RuntimeOptions) {
		this.files = options.files;
		this.modules = new Map();
	}

	public readonly files: Map<string, string>;
	public readonly modules: Map<string, Module>;

	public require(filename: string) {
		let module = this.modules.get(filename);
		if (module === undefined) {
			const code = this.files.get(filename);
			if (code === undefined) {
				throw new Error(`Module not found: ${filename}`);
			}
			module = new Module(this, filename, code);
			this.modules.set(filename, module);
		}
		return module.exports;
	}

	public render(tagName: string, props: Record<string, any> = {}, ...children: any[]) {
		return new Element(tagName, props, children);
	}
}

export class Element {
	public constructor(
		readonly tagName: string,
		readonly props: Record<string, any>,
		readonly children: any[]
	) {}

	public render(): string {
		const props = Object.keys(this.props).map(key => {
			return ` ${key}="${escape(String(this.props[key]))}"`;
		}).join("");

		const children = this.children
			.flat(Infinity)
			.reduce((acc: any[], child) => {
				if (typeof child === "string") {
					child = child.trim();
				}
				if (child.length === 0) {
					return acc;
				}
				if (typeof child === "string" && typeof acc[acc.length - 1] === "string") {
					acc[acc.length - 1] += " " + child;
					return acc;
				} else {
					return acc.concat(child);
				}
			}, [])
			.reduce<string>((code: string, child) => {
				if (typeof child === "string") {
					return code + child;
				} else if (child instanceof Element) {
					return code + child.render();
				} else {
					throw new Error(`Invalid child node: ${child}`);
				}
			}, "");

		return children
			? `<${this.tagName}${props}>${children}</${this.tagName}>`
			: `<${this.tagName}${props}/>`;
	}
}

export class Module {
	public constructor(runtime: Runtime, filename: string, code: string) {
		this.runtime = runtime;
		this.filename = filename;
		this.dirname = path.dirname(filename);
		this.code = code;

		createContext(this);
		runInContext(code, this);
	}

	public readonly runtime: Runtime;
	public readonly filename: string;
	public readonly dirname: string;
	public readonly code: string;

	public exports: any = {};

	public get console() {
		return console;
	}

	public readonly require = (request: string) => {
		if (/^(\.|\.\.)([\\\/]|$)/.test(request)) {
			request = path.resolve(this.dirname, request);
		}
		if (path.isAbsolute(request)) {
			return this.runtime.require(request);
		}
		throw new Error(`Invalid module request: ${request}`);
	};
}
