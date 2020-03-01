
export type Disposable = void | (() => void);

export function dispose(target: Disposable) {
	if (typeof target === "function") {
		target();
	}
}
