import { Emitter, Event } from "../common/emitter";

export const router = new class extends Emitter<{
	update: Event
}> {
	private _path: string[] = [];

	public get path(): readonly string[] {
		return this._path;
	}

	public set path(value: readonly string[]) {
		location.hash = "#" + value.map(encodeURIComponent).join("/");
	}

	public get pathStr() {
		return location.hash.slice(1);
	}

	public set pathStr(value: string) {
		this.path = value.split("/").filter(s => s).map(decodeURIComponent);
	}

	public constructor() {
		super();
		window.addEventListener("hashchange", this._update.bind(this));
		this._update();
	}

	private _update() {
		this._path = location.hash.slice(1).split("/").filter(s => s).map(decodeURIComponent);
		this.emit("update");
	}
}
