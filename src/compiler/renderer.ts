import { Emitter, Event } from "../common/emitter";
import { Config, RenderTarget } from "./config";
import { Log } from "../common/logging";
import { Runtime, RuntimeEmitEvent, RuntimeInvalidateEvent } from "./runtime";
import { ModuleCompiler, ModuleCompilerDeleteEvent } from "./module-compiler";
import { Disposable, dispose } from "../common/disposable";
import { Element } from "../runtime";
import * as htmlEscape from "escape-html";
import { FileEvent } from "./file-emitter";
import { parseViewBox } from "./properties/view-box";

export interface RendererEmitEvent {
	readonly moduleFilename: string;
	readonly name: string;
	readonly data: string;
}

export interface RendererInvalidateEvent {
	readonly moduleFilename: string;
	readonly deleted: boolean;
}

export class Renderer extends Emitter<{
	file: Event<[FileEvent]>,
	emit: Event<[RendererEmitEvent]>,
	invalidate: Event<[RendererInvalidateEvent]>,
	error: Event<[any]>
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
			try {
				this._runtime.run();
			} catch (error) {
				this.emit("error", error);
			}
		}
	}

	private _deleteFile({ moduleFilename }: ModuleCompilerDeleteEvent) {
		this._runtime.deleteFile(moduleFilename);
	}

	private _run() {
		if (!this._done) {
			try {
				this._runtime.run();
			} catch (error) {
				this.emit("error", error);
			}
			this._done = true;
		}
	}

	private _emit({ moduleFilename, name, element }: RuntimeEmitEvent) {
		const target = this.config.target;

		const data = target === RenderTarget.dom
			? this.formatDomSvg(element)
			: this.formatXmlSvg(element);

		switch (target) {
			case RenderTarget.png:
			case RenderTarget.jpeg: {
				const { createCanvas, Image } = require("canvas") as typeof import("canvas");
				const viewBox = parseViewBox(element.props.viewBox);

				const scale = this.config.scale;

				const image = new Image();
				image.src = `data:image/svg+xml;base64,${Buffer.from(data, "utf8").toString("base64")}`;
				image.width = viewBox.width * scale;
				image.height = viewBox.height * scale;

				const canvas = createCanvas(viewBox.width * scale, viewBox.height * scale);
				const ctx = canvas.getContext("2d");
				ctx.drawImage(image, 0, 0);

				const parts: Buffer[] = [];
				const stream = target === RenderTarget.png
					? canvas.createPNGStream()
					: canvas.createJPEGStream({ quality: this.config.quality });

				stream.on("error", error => this.emit("error", error));
				stream.on("data", data => parts.push(data));
				stream.on("end", () => {
					const filename = name + (target === RenderTarget.png ? ".png" : ".jpg");
					this.emit("file", { filename, data: Buffer.concat(parts) });
				});

				break;
			}

			default: {
				const filename = name + ".svg";
				this.emit("file", { filename, data });
				break;
			}
		}
		this.emit("emit", { moduleFilename, name, data });
	}

	private _invalidate({ moduleFilename, deleted }: RuntimeInvalidateEvent) {
		this.emit("invalidate", { moduleFilename, deleted });
	}
}
