import { Module } from "./module";
import { statSync } from "fs";
import { sync as resolve } from "resolve";
import * as path from "path";
import { Element } from "./element";

/**
 * A commonjs like runtime for veco modules that
 * also allows access to regular node modules.
 */
export class Runtime {
	public constructor(options: RuntimeOptions) {
		this._emitElement = options.emitElement;
	}

	private readonly _emitElement: EmitElementCallback;
	private readonly _dirs = new Set<string>();
	private readonly _files = new Map<string, string>();
	private readonly _modules = new Map<string, Module>();

	public writeFile(filename: string, data: string) {
		(function invalidate(this: Runtime, filename: string) {
			const module = this._modules.get(filename);
			if (module) {
				this._modules.delete(filename);
				module.dependants.forEach(filename => invalidate.call(this, filename));
			}
		}).call(this, filename);

		this._files.set(filename, data);
		for (;;) {
			const parent = path.dirname(filename);
			if (parent === filename) {
				break;
			}
			const sizeBefore = this._dirs.size;
			if (this._dirs.add(parent).size === sizeBefore) {
				break;
			}
		}
	}

	public runEntryModules() {
		for (const filename of this._files.keys()) {
			if (/\.veco$/.test(filename)) {
				this.require(filename);
			}
		}
	}

	public isStale(module: Module) {
		return this._modules.get(module.filename) !== module;
	}

	public require(request: string, by?: Module): any {
		const filename = this.resolve(request, by?.dirname);

		let module = this._modules.get(filename);
		if (module !== undefined) {
			if (by) {
				module.dependants.add(by.filename);
			}
			return module.exports;
		}

		const data = this._files.get(filename);
		if (data !== undefined) {
			module = new Module(this, filename, data, this._emitElement);
			if (by) {
				module.dependants.add(by.filename);
			}
			this._modules.set(filename, module);
			return module.exports;
		}

		return require(filename);
	}

	public resolve(request: string, basedir?: string): string {
		return resolve(request, {
			extensions: [".veco", ".js", ".json"],
			basedir,
			isFile: filename => {
				if (this._files.has(filename)) {
					return true;
				}
				try {
					return statSync(filename).isFile();
				} catch {
					return false;
				}
			},
			isDirectory: dirname => {
				if (this._dirs.has(dirname)) {
					return true;
				}
				try {
					return statSync(dirname).isDirectory();
				} catch {
					return false;
				}
			}
		});
	}
}

export interface RuntimeOptions {
	emitElement: EmitElementCallback;
}

export type EmitElementCallback = (name: string, element: Element) => void;
