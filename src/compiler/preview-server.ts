import * as path from "path";
import { Config } from "./config";
import * as express from "express";
import { Server, createServer } from "http";
import { AddressInfo } from "net";
import { Emitter } from "../common/emitter";
import { Log } from "../common/logging";
import { SvgBuilder } from "./svg-builder";

export class PreviewServer extends Emitter<{
}> {
	public constructor(public readonly config: Config, public readonly log: Log) {
		super();
		this._app = express();
		this._server = createServer(this._app);
	}

	private readonly _app: express.Express;
	private readonly _server: Server;

	private readonly _svgs = new Map<string, string>();

	public use(source: SvgBuilder) {
		return source.hook("file", (filename, data) => {
			filename = path.relative(this.config.compilerOptions.outDir, filename);
			this._svgs.set(filename, data);
			// TODO: Send file update to web sockets.
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
