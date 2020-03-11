import { Emitter, Event } from "../common/emitter";
import { Config, SvgTarget } from "./config";
import { Log } from "../common/logging";
import { Runtime, RuntimeEmitEvent, RuntimeInvalidateEvent } from "./runtime";
import { ModuleCompiler, ModuleCompilerDeleteEvent } from "./module-compiler";
import { Disposable, dispose } from "../common/disposable";
import { Element } from "../runtime";
import * as htmlEscape from "escape-html";
import { FileEvent } from "./file-emitter";

export interface RendererEmitEvent {
	readonly moduleFilename: string;
	readonly filename: string;
	readonly data: string;
}

export interface RendererInvalidateEvent {
	readonly moduleFilename: string;
	readonly deleted: boolean;
}

export class Renderer extends Emitter<{
	file: Event<[FileEvent]>,
	emit: Event<[RendererEmitEvent]>,
	invalidate: Event<[RendererInvalidateEvent]>
}> {
	public constructor(public readonly config: Config, public readonly log: Log) {
		super();
		this._runtime = new Runtime(log.fork("runtime"));
		this._runtime.on("emit", this._emit.bind(this));
		this._runtime.on("invalidate", this._invalidate.bind(this));

		this._newline = config.format.newline;
		this._indent = config.format.indent;
	}

	private readonly _runtime: Runtime;
	private readonly _newline: string;
	private readonly _indent: string;
	private _done = false;

	public use(source: ModuleCompiler): Disposable {
		const subscriptions = [
			source.hook("file", this._writeFile.bind(this)),
			source.hook("delete", this._deleteFile.bind(this)),
			source.hook("done", this._run.bind(this))
		];
		return () => void subscriptions.forEach(dispose);
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

	protected formatXmlSvg(element: Element) {
		element = new Element(
			element.tagName,
			Object.assign({
				xmlns: "http://www.w3.org/2000/svg"
			}, element.props),
			element.children
		);
		return `<?xml version="1.0" encoding="utf-8"?>${this._newline || "\n"}${this.formatElement("", element)}${this._newline}`;
	}

	protected formatDomSvg(element: Element) {
		return this.formatElement("", element);
	}

	private _writeFile(filename: string, data: string) {
		this._runtime.writeFile(filename, data);
		if (this._done) {
			this._runtime.run();
		}
	}

	private _deleteFile({ moduleFilename }: ModuleCompilerDeleteEvent) {
		this._runtime.deleteFile(moduleFilename);
	}

	private _run() {
		if (!this._done) {
			this._runtime.run();
			this._done = true;
		}
	}

	private _emit({ moduleFilename, name, element }: RuntimeEmitEvent) {
		const data = this.config.target === SvgTarget.xml
			? this.formatXmlSvg(element)
			: this.formatDomSvg(element);

		const filename = name + ".svg";
		this.emit("file", { filename, data });
		this.emit("emit", { moduleFilename, filename, data });
	}

	private _invalidate({ moduleFilename, deleted }: RuntimeInvalidateEvent) {
		this.emit("invalidate", { moduleFilename, deleted });
	}
}
