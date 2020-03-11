import * as path from "path";
import { Config } from "./config";
import * as express from "express";
import { Server, createServer } from "http";
import { AddressInfo } from "net";
import { Emitter } from "../common/emitter";
import { Log } from "../common/logging";
import { Renderer } from "./renderer";
import * as WebSocket from "ws";
import { Disposable, dispose } from "../common/disposable";
import { Message } from "./preview-socket-messages";

interface Svg {
	readonly moduleFilename: string;
	readonly data: string;
}

export class PreviewServer extends Emitter<{
}> {
	public constructor(public readonly config: Config, public readonly log: Log) {
		super();
		this._app = express();
		this._app.use(express.static(path.join(__dirname, "../preview")));

		this._server = createServer(this._app);
		this._wss = new WebSocket.Server({ server: this._server });
		this._wss.on("connection", socket => {
			for (const [filename, svg] of this._svgs) {
				socket.send(JSON.stringify({
					type: "emit",
					moduleFilename: externalize(this.config.cwd, svg.moduleFilename),
					filename: externalize(this.config.compilerOptions.outDir, filename),
					data: svg.data
				}));
			}
		});
	}

	private readonly _app: express.Express;
	private readonly _server: Server;
	private readonly _wss: WebSocket.Server;

	private readonly _svgs = new Map<string, Svg>();
	private readonly _svgByModuleIndex = new Map<string, Set<string>>();

	private _send(message: Message) {
		const data = JSON.stringify(message);
		for (const socket of this._wss.clients) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(data);
			}
		}
	}

	public use(source: Renderer): Disposable {
		const hooks = [
			source.hook("emit", ({ moduleFilename, filename, data }) => {
				this._svgs.set(filename, { moduleFilename, data });
				const index = this._svgByModuleIndex.get(moduleFilename);
				if (index) {
					index.add(filename);
				} else {
					this._svgByModuleIndex.set(moduleFilename, new Set([filename]));
				}
				this._send({
					type: "emit",
					moduleFilename: externalize(this.config.cwd, moduleFilename),
					filename: externalize(this.config.compilerOptions.outDir, filename),
					data
				});
			}),
			source.hook("invalidate", ({ moduleFilename, deleted }) => {
				const index = this._svgByModuleIndex.get(moduleFilename);
				if (index) {
					index.forEach(filename => this._svgs.delete(filename));
				}
				this._svgByModuleIndex.delete(moduleFilename);
				this._send({
					type: "invalidate",
					moduleFilename: externalize(this.config.cwd, moduleFilename),
					deleted
				});
			})
		];
		return () => hooks.forEach(dispose);
	}

	public start() {
		return new Promise<AddressInfo>((resolve, reject) => {
			this._server.once("error", reject);
			this._server.listen(this.config.preview.port, this.config.preview.address, () => {
				this._server.off("error", reject);
				resolve(this._server.address() as AddressInfo);
			});
		});
	}

	public stop() {
		return new Promise<void>((resolve, reject) => {
			this._server.close(error => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}
}

function externalize(context: string, value: string) {
	return path.relative(context, value).replace(/\\/g, "/");
}
