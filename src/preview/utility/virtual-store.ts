
export type Dir<T> = Map<string, DirEntry<T>>;
export type DirEntry<T> = ["dir", Dir<T>] | ["val", T];

export type ReadonlyDir<T> = ReadonlyMap<string, ReadonlyDirEntry<T>>;
export type ReadonlyDirEntry<T> = ["dir", ReadonlyDir<T>] | ["val", T];

export interface ReadonlyVirtualStore<T> {
	dir(path: string): ReadonlyDir<T> | undefined;
	get(path: string): ReadonlyDirEntry<T> | undefined;
}

export class VirtualStore<T> implements ReadonlyVirtualStore<T> {
	private readonly _root: Dir<T> = new Map();

	public get(path: string): ReadonlyDirEntry<T> | undefined {
		const names = path.split("/").filter(s => s).map(decodeURIComponent);
		for (let dir = this._root, i = 0; i < names.length; i++) {
			const child = dir.get(names[i]);
			if (child) {
				if (i === names.length - 1) {
					return child;
				} else if (child[0] === "dir") {
					dir = child[1];
				} else {
					return;
				}
			} else {
				return;
			}
		}
		return ["dir", this._root];
	}

	public dir(path: string): ReadonlyDir<T> | undefined {
		const names = path.split("/").filter(s => s).map(decodeURIComponent);
		for (let dir = this._root, i = 0; i < names.length; i++) {
			const child = dir.get(names[i]);
			if (child && child[0] === "dir") {
				if (i === names.length - 1) {
					return child[1];
				} else {
					dir = child[1];
				}
			} else {
				return;
			}
		}
		return this._root;
	}

	public put(path: string, value: T) {
		const names = path.split("/").filter(s => s).map(decodeURIComponent);
		for (let dir = this._root, i = 0; i < names.length; i++) {
			if (i < names.length - 1) {
				const child = dir.get(names[i]);
				if (child && child[0] === "dir") {
					dir = child[1];
				} else {
					const children = new Map();
					dir.set(names[i], ["dir", children]);
					dir = children;
				}
			} else {
				dir.set(names[i], ["val", value]);
			}
		}
	}

	public del(path: string) {
		const names = path.split("/").filter(s => s).map(decodeURIComponent);
		(function del(dir, i) {
			if (i < names.length) {
				const child = dir.get(names[i]);
				if (child) {
					if (child[0] === "dir") {
						del(child[1], i + 1);
						if (child[1].size === 0) {
							dir.delete(names[i]);
						}
					} else if (i === names.length - 1) {
						dir.delete(names[i]);
					}
				}
			}
		})(this._root, 0);
	}
}
