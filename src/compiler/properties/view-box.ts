
export interface ViewBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function parseViewBox(value: any): ViewBox {
	if (typeof value !== "string") {
		throw new TypeError(`invalid viewBox: ${value}`);
	}
	const raw = value.split(" ", 4);
	const x = Number(raw[0]);
	const y = Number(raw[1]);
	const width = Number(raw[2]);
	const height = Number(raw[3]);
	if (isNaN(x) || isNaN(y) || isNaN(width) || width <= 0 || height <= 0 || isNaN(height)) {
		throw new TypeError(`invalid viewBox values: ${value}`);
	}
	return { x, y, width, height };
}
