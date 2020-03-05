import { Runtime } from "./runtime";
import { ModuleCompiler } from "./module-compiler";
import { Disposable, dispose } from "../common/disposable";
import { Emitter, Event } from "../common/emitter";
import { Element } from "./runtime/element";
import { FileEmitter } from "./file-emitter";
import * as htmlEscape from "escape-html";

/**
 * The svg builder is used as compiler output to
 * run compiled modules and emit svg instances.
 */
export class SvgBuilder extends Emitter<{
	file: Event<[string, string]>
}> implements FileEmitter {
	public constructor(options: SvgBuilderOptions) {
		super();
		this._runtime = new Runtime({
			emitElement: this._emitElement.bind(this)
		});

		// TODO: Move normalization and validation to config module.
		const format = options.format || {};
		this._target = format.target === undefined ? "dom" : format.target;
		this._indent = format.indent === undefined ? "\t" : format.indent;
		this._newline = format.newline === undefined ? "\n" : format.newline;

		this._target = "xml";
	}

	private readonly _runtime: Runtime;
	private readonly _target: SvgFormatTarget;
	private readonly _indent: string;
	private readonly _newline: string;

	public use(source: ModuleCompiler): Disposable {
		const subscriptions = [
			source.hook("file", this._runtime.writeFile.bind(this._runtime)),
			source.hook("done", this._run.bind(this))
		];
		return () => void subscriptions.forEach(dispose);
	}

	private _run() {
		this._runtime.runEntryModules();
	}

	private _emitElement(name: string, element: Element) {
		const data = this.formatSvg(element);
		this.emit("file", name + ".svg", data);
	}

	protected formatValue(key: string, value: any): string {
		return htmlEscape(String(value));
	}

	protected formatChild(indent: string, child: any) {
		if (child instanceof Element) {
			return this.formatElement(indent, child);
		}
		return indent + String(child);
	}

	protected formatElement(indent: string, element: Element): string {
		const props = Object.entries(element.props).map(([key, value]) => {
			return ` ${key}="${this.formatValue(key, value)}"`;
		}).join("");
		const childIndent = indent + this._indent;
		const children = element.children.flat(Infinity).map(child => {
			return this.formatChild(childIndent, child);
		});
		return children.length > 0
			? `${indent}<${element.tagName}${props}>${this._newline}${
				children.join(this._newline)
			}${this._newline}${indent}</${element.tagName}>`
			: `${indent}<${element.tagName}${props}/>`;
	}

	protected formatSvg(root: Element) {
		switch (this._target) {
			case "xml": {
				root = new Element(
					root.tagName,
					Object.assign({
						xmlns: "http://www.w3.org/2000/svg"
					}, root.props),
					root.children
				);
				return `<?xml version="1.0" encoding="utf-8"?>${this._newline || "\n"}${this.formatElement("", root)}${this._newline}`;
			}

			case "dom": {
				return this.formatElement("", root);
			}

			default: throw new TypeError("invalid target");
		}
	}
}

export interface SvgBuilderOptions {
	readonly format?: SvgFormat;
}

export interface SvgFormat {
	readonly target?: SvgFormatTarget;
	readonly indent?: string;
	readonly newline?: string;
}

export type SvgFormatTarget = "xml" | "dom";
