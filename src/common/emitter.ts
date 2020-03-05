import { parallel, Async } from "./async";
import { map } from "./iterables";
import { Disposable } from "./disposable";

const LISTENERS = Symbol("listeners");

type Args<T extends EventTypes, K extends keyof T> = T[K]["args"];
type IsAsync<T extends EventTypes, K extends keyof T> = T[K]["async"];

type KeyForEvent<T extends EventTypes, K extends keyof T> = IsAsync<T, K> extends true ? never : K;
type KeyForAsyncEvent<T extends EventTypes, K extends keyof T> = IsAsync<T, K> extends true ? K : never;

export type EventTypes = { [key: string]: { args: any[], async: boolean } };
export type EventListener<T extends EventTypes, K extends keyof T> = (...args: Args<T, K>) => (IsAsync<T, K> extends true ? (Promise<any> | void | undefined) : (void | undefined));

export type Event<A extends any[] = []> = { args: A, async: false };
export type AsyncEvent<A extends any[] = []> = { args: A, async: true };

export interface IEmitter<T extends EventTypes> {
	on<K extends keyof T>(key: K, listener: EventListener<T, K>): EventListener<T, K>;
	off<K extends keyof T>(key: K, listener: EventListener<T, K>): void;
	hook<K extends keyof T>(key: K, listener: EventListener<T, K>): Disposable;
}

/**
 * A fully typed event emitter with support for lazy and async events.
 */
export abstract class Emitter<T extends EventTypes> implements IEmitter<T> {
	private readonly [LISTENERS] = new Map<keyof T, Set<EventListener<any, any>>>();

	public on<K extends keyof T>(key: K, listener: EventListener<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners === undefined) {
			this[LISTENERS].set(key, new Set([<any> listener]));
		} else {
			listeners.add(listener);
		}
		this.onSubscribe(key, listener);
		return listener;
	}

	public off<K extends keyof T>(key: K, listener: EventListener<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners !== undefined && listeners.delete(listener)) {
			if (listeners.size === 0) {
				this[LISTENERS].delete(key);
			}
			this.onUnsubscribe(key, listener);
		}
	}

	public hook<K extends keyof T>(key: K, listener: EventListener<T, K>): Disposable {
		this.on(key, listener);
		return () => void this.off(key, listener);
	}

	protected onSubscribe<K extends keyof T>(key: K, listener: EventListener<T, K>) {}
	protected onUnsubscribe<K extends keyof T>(key: K, listener: EventListener<T, K>) {}

	protected emit<K extends keyof T>(key: KeyForEvent<T, K>, ...args: Args<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners !== undefined) {
			listeners.forEach(listener => listener(...args));
		}
	}

	protected emitLazy<K extends keyof T>(key: KeyForEvent<T, K>, unwrap: () => Args<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners !== undefined && listeners.size > 0) {
			const args = unwrap();
			listeners.forEach(listener => listener(...args));
		}
	}

	protected async emitAsync<K extends keyof T>(key: KeyForAsyncEvent<T, K>, ...args: Args<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners !== undefined) {
			await parallel(map(listeners, listener => listener(...args)));
		}
	}

	protected async emitAsyncLazy<K extends keyof T>(key: KeyForAsyncEvent<T, K>, unwrap: () => Args<T, K>) {
		const listeners = this[LISTENERS].get(key);
		if (listeners !== undefined && listeners.size > 0) {
			const args = unwrap();
			await parallel(map(listeners, listener => listener(...args)));
		}
	}
}
