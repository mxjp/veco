import { Emitter, Event } from "../common/emitter";
import { Message } from "../compiler/preview-socket-messages";
import { VirtualStore, ReadonlyVirtualStore } from "./utility/virtual-store";

export const client = new class extends Emitter<{
	update: Event
}> {
	private readonly _svgs = new VirtualStore<string>();
	private readonly _modules = new Map<string, Set<string>>();

	public get svgs() {
		return <ReadonlyVirtualStore<string>> this._svgs;
	}

	public constructor() {
		super();
		this._connect();
	}

	private _connect() {
		const endpoint = process.env.VECO_DEV_API
			? `ws://${location.hostname}:${3000}/`
			: `ws://${location.host}/`;

		const socket = new WebSocket(endpoint);
		socket.addEventListener("close", this._onClose.bind(this));
		socket.addEventListener("open", this._onOpen.bind(this));
		socket.addEventListener("message", e => {
			const msg: Message = JSON.parse(e.data);
			this._onMessage(msg);
		});
	}

	private _onClose() {
		setTimeout(this._connect.bind(this), 1000);
	}

	private _onOpen() {
		this.emit("update");
	}

	private _onMessage(msg: Message) {
		switch (msg.type) {
			case "emit": {
				this._svgs.put(msg.filename, msg.data);
				const index = this._modules.get(msg.moduleFilename);
				if (index) {
					index.add(msg.filename);
				} else {
					this._modules.set(msg.moduleFilename, new Set([msg.filename]));
				}
				this.emit("update");
				break;
			}

			case "invalidate": {
				if (msg.deleted) {
					for (const filename of this._modules.get(msg.moduleFilename) || []) {
						this._svgs.del(filename);
					}
					this._modules.delete(msg.moduleFilename);
					this.emit("update");
				}
				break;
			}

			default: {
				console.error("Unknown message:", msg);
				break;
			}
		}
	}
};
