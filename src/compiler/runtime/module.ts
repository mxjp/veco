import * as path from "path";
import { Runtime, EmitElementCallback } from ".";
import { createContext, runInContext } from "vm";
import { Element } from "./element";

export class Module {
	public readonly dependants = new Set<string>();
	public readonly dirname: string;
	public readonly name: string;

	private _exports: any = {};

	public constructor(
		public readonly runtime: Runtime,
		public readonly filename: string,
		public readonly data: string,
		private readonly _emitElement: EmitElementCallback
	) {
		this.dirname = path.dirname(filename);
		this.name = path.basename(filename, path.extname(filename));
		runInContext(data, this._createContext());
	}

	public get exports() {
		return this._exports;
	}

	private _require(request: string) {
		return this.runtime.require(request, this);
	}

	private _createContext() {
		const module = this;
		return createContext({
			require: module._require.bind(module),

			module: {
				get exports() {
					return module._exports;
				},
				set exports(value: any) {
					module._exports = value;
				}
			},

			get exports() {
				return module._exports;
			},

			render(tagName: string, props?: Record<string, any> | null, ...children: any[]) {
				return new Element(tagName, props || {}, children);
			},

			emit(element: Element, name = module.name) {
				if (module.runtime.isStale(module)) {
					module._emitElement(path.resolve(module.dirname, name), element);
				}
			}
		});
	}
}
