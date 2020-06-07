
/**
 * A 2-dimensional vector utility.
 */
export class Vec {
	public constructor(
		public readonly x: number,
		public readonly y: number
	) {}

	public add(value: Vec): Vec {
		return new Vec(this.x + value.x, this.y + value.y);
	}

	public sub(value: Vec) {
		return new Vec(this.x - value.x, this.y - value.y);
	}

	public mul(value: number) {
		return new Vec(this.x * value, this.y * value);
	}

	public div(value: number) {
		return new Vec(this.x * value, this.y * value);
	}

	public distanceSqr(to: Vec): number {
		return (this.x - to.x) ** 2 + (this.y - to.y) ** 2;
	}

	public distance(to: Vec): number {
		return Math.sqrt(this.distanceSqr(to));
	}

	public normalize() {
		const l = this.length;
		return new Vec(this.x / l, this.y / l);
	}

	public get lengthSqr() {
		return this.x ** 2 + this.y ** 2;
	}

	public get length() {
		return Math.sqrt(this.lengthSqr);
	}

	public equals(value: Vec) {
		return this.x === value.x && this.y === value.y;
	}

	public rotate(angle: number) {
		const { x, y } = this;
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);
		return new Vec(x * cos - y * sin, x * sin + y * cos);
	}

	public rotateAround(center: Vec, angle: number) {
		return this.sub(center).rotate(angle).add(center);
	}

	public isNaN() {
		return isNaN(this.x) || isNaN(this.y);
	}

	public toString() {
		return `${this.x},${this.y}`;
	}
}
