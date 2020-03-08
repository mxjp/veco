import { Emitter, Event } from "../common/emitter";

export const client = new class extends Emitter<{
	update: Event
}> {
	private readonly _svgs = new Map<string, string>();

	public get svgs(): ReadonlyMap<string, string> {
		return this._svgs;
	}

	public constructor() {
		super();
		(function connect() {
			const endpoint = process.env.VECO_DEV_API
				? `ws://${location.hostname}:${3000}/`
				: `ws://${location.host}/`;

			const socket = new WebSocket(endpoint);
			socket.addEventListener("close", () => {
				setTimeout(connect, 1000);
			});
			socket.addEventListener("open", () => {
				client._svgs.clear();
				client.emit("update");
			});
			socket.addEventListener("message", e => {
				const msg = JSON.parse(e.data);
				switch (msg.type) {
					case "svg":
						client._svgs.set(msg.filename, msg.data);
						client.emit("update");
						break;

					default:
						console.error("Unknown message:", msg);
				}
			});
		})();
	}
};
