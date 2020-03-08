import * as path from "path";
import { Config } from "./config";
import * as express from "express";
import { Server, createServer } from "http";
import { AddressInfo } from "net";
import { Emitter } from "../common/emitter";
import { Log } from "../common/logging";
import { SvgBuilder } from "./svg-builder";
import * as WebSocket from "ws";

export class PreviewServer extends Emitter<{
}> {
	public constructor(public readonly config: Config, public readonly log: Log) {
		super();
		this._app = express();
		this._server = createServer(this._app);
		this._wss = new WebSocket.Server({ server: this._server });
		this._wss.on("connection", socket => {
			for (const [filename, data] of this._svgs) {
				socket.send(JSON.stringify({ type: "svg", filename, data }));
			}
		});
	}

	private readonly _app: express.Express;
	private readonly _server: Server;
	private readonly _wss: WebSocket.Server;

	private readonly _svgs = new Map<string, string>();

	public use(source: SvgBuilder) {
		return source.hook("file", (filename, data) => {
			filename = path.relative(this.config.compilerOptions.outDir, filename);
			this._svgs.set(filename, data);
			for (const socket of this._wss.clients) {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ type: "svg", filename, data }));
				}
			}
		});
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
