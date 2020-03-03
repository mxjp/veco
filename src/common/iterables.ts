
/**
 * Similar to `Array.prototype.map`, but with iterators.
 */
export function * map<T, O>(iterator: Iterable<T>, fn: (value: T) => O) {
	for (const value of iterator) {
		yield fn(value);
	}
}

/**
 * Similar to `Array.prototype.map`, but with iterators.
 */
export function mapToArray<T, O>(iterator: Iterable<T>, fn: (value: T) => O) {
	const array: O[] = [];
	for (const value of iterator) {
		array.push(fn(value));
	}
	return array;
}
