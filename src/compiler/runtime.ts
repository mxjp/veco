import * as path from "path";
import { Log } from "../common/logging";
import { RuntimeModule } from "./runtime-module";
import { Emitter, Event } from "../common/emitter";
import { Element } from "../runtime";

const RUNTIME_API_PATH = require.resolve("../runtime");

export class Runtime extends Emitter<{
	emit: Event<[string, string, Element]>
}> {
	public constructor(public readonly log: Log) {
		super();
	}

	private readonly _files = new Map<string, string>();
	private readonly _modules = new Map<string, RuntimeModule>();

	private readonly _emitCallback: RuntimeEmitCallback = (moduleFilename: string, name: string, element: Element) => {
		this.emit("emit", moduleFilename, name, element);
	};

	public writeFile(filename: string, data: string) {
		(function invalidate(this: Runtime, filename: string) {
			const module = this._modules.get(filename);
			if (module) {
				this._modules.delete(filename);
				module.dependants.forEach(filename => invalidate.call(this, filename));
			}
		}).call(this, filename);
		this._files.set(filename, data);
	}

	public run() {
		for (const filename of this._files.keys()) {
			if (/\.js$/.test(filename)) {
				this.require(filename);
			}
		}
	}

	public require(request: string, by?: RuntimeModule): any {
		const filename = this._resolve(request, by?.dirname);

		let module = this._modules.get(filename);
		if (module !== undefined) {
			if (by) {
				module.dependants.add(by.filename);
			}
			return module.exports;
		}

		const data = this._files.get(filename);
		if (data !== undefined) {
			module = new RuntimeModule(this, filename, data, this._emitCallback);
			if (by) {
				module.dependants.add(by.filename);
			}
			this._modules.set(filename, module);
			return module.exports;
		}

		if (by) {
			request = require.resolve(request);
			if (request === RUNTIME_API_PATH) {
				return by.getRuntimeAPI();
			}
		}

		return require(request);
	}

	private _resolve(request: string, basedir?: string): string {
		if (basedir && /^(\.|\.\.)([\\\/]|$)/.test(request)) {
			request = path.join(basedir, request);
		}
		for (const filename of possibleModuleFilenames(request)) {
			if (this._files.has(filename)) {
				return filename;
			}
		}
		return request;
	}
}

export type RuntimeEmitCallback = (moduleFilename: string, name: string, element: Element) => void;

function * possibleModuleFilenames(request: string) {
	yield request;
	yield request + ".js";
	yield path.normalize(request + "/index.js");
}
