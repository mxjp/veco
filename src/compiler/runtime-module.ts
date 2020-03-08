import * as path from "path";
import { Runtime, RuntimeEmitCallback } from "./runtime";
import { runInContext, createContext } from "vm";
import * as RuntimeApi from "../runtime";

export class RuntimeModule {
	public readonly dependants = new Set<string>();
	public readonly dirname: string;
	public readonly name: string;

	private _exports: any = {};
	private _runtime: null | typeof RuntimeApi = null;

	public constructor(
		public readonly runtime: Runtime,
		public readonly filename: string,
		public readonly data: string,
		private readonly _emitCallback: RuntimeEmitCallback
	) {
		this.dirname = path.dirname(filename);
		this.name = path.basename(filename, path.extname(filename));
		runInContext(data, this._createContext());
	}

	public get exports() {
		return this._exports;
	}

	public getRuntimeAPI(): typeof RuntimeApi {
		if (!this._runtime) {
			this._runtime = Object.assign(Object.create(RuntimeApi), <typeof RuntimeApi> {
				emit: this._runtimeEmit.bind(this)
			});
		}
		return this._runtime!;
	}

	private _require(request: string) {
		return this.runtime.require(request, this);
	}

	private _runtimeEmit(element: RuntimeApi.Element, name = this.name) {
		this._emitCallback(this.filename, path.resolve(this.dirname, name), element);
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

			console,

			get exports() {
				return module._exports;
			}
		});
	}
}
