import { Async } from "./async";

export type Disposable = void | (() => void);

export function dispose(target: Disposable) {
	if (typeof target === "function") {
		target();
	}
}

export type AsyncDisposable = void | (() => Async);

export function disposeAsync(target: AsyncDisposable) {
	if (typeof target === "function") {
		return target();
	}
}
