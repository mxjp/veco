
export type Async<T = void> = T | PromiseLike<T>;

export function isPromiseLike<T>(value: Async<T>): value is PromiseLike<T> {
	return value && typeof (value as PromiseLike<T>).then === "function";
}

export function then<T>(value: Async<T>, onResolve: (value: T) => void, onReject?: (error: any) => void) {
	if (isPromiseLike(value)) {
		value.then(onResolve, onReject);
	} else {
		onResolve(value);
	}
}

export function asPromise<T>(value: Async<T>): Promise<T> {
	return value instanceof Promise ? value : Promise.resolve(value);
}

export function createAsyncQueue() {
	let current: Promise<any> = Promise.resolve();
	return <T> (action: () => T | Promise<T>) => {
		return <Promise<T>> (current = current.then(action, action));
	};
}

export function parallel(values: []): Promise<[]>;
export function parallel<T1>(values: [Async<T1>]): Promise<[T1]>;
export function parallel<T1, T2>(values: [Async<T1>, Async<T2>]): Promise<[T1, T2]>;
export function parallel<T1, T2, T3>(values: [Async<T1>, Async<T2>, Async<T3>]): Promise<[T1, T2, T3]>;
export function parallel<T1, T2, T3, T4>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>]): Promise<[T1, T2, T3, T4]>;
export function parallel<T1, T2, T3, T4, T5>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>, Async<T5>]): Promise<[T1, T2, T3, T4, T5]>;
export function parallel<T1, T2, T3, T4, T5, T6>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>, Async<T5>, Async<T6>]): Promise<[T1, T2, T3, T4, T5, T6]>;
export function parallel<T1, T2, T3, T4, T5, T6, T7>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>, Async<T5>, Async<T6>, Async<T7>]): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
export function parallel<T1, T2, T3, T4, T5, T6, T7, T8>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>, Async<T5>, Async<T6>, Async<T7>, Async<T8>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
export function parallel<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: [Async<T1>, Async<T2>, Async<T3>, Async<T4>, Async<T5>, Async<T6>, Async<T7>, Async<T8>, Async<T9>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;

export function parallel<T extends any[]>(values: T): Promise<{
	[K in keyof T]: T[K] extends PromiseLike<infer P> ? P : T[K]
}>;

export function parallel<T>(values: Iterable<Async<T>>): Promise<T[]>;

export function parallel<T>(values: Iterable<Async<T>>) {
	return new Promise<T[]>((resolve, reject) => {
		const results: T[] = [];
		const errors: any[] = [];

		let iterableDone = false;
		let pendingPromises = 0;

		function done() {
			if (iterableDone && pendingPromises === 0) {
				if (errors.length > 1) {
					reject(errors);
				} else if (errors.length === 1) {
					reject(errors[0]);
				} else {
					resolve(results);
				}
			}
		}

		let nextIndex = 0;
		for (const value of values) {
			const index = nextIndex++;
			if (isPromiseLike(value)) {
				pendingPromises++;
				try {
					value.then(result => {
						results[index] = result;
						pendingPromises--;
						done();
					}, error => {
						errors.push(error);
						pendingPromises--;
						done();
					});
				} catch (error) {
					pendingPromises--;
					errors.push(error);
				}
			} else {
				results[index] = value;
			}
		}

		iterableDone = true;
		done();
	});
}
