
export class Element {
	public constructor(
		public readonly tagName: string,
		public readonly props: Record<string, any>,
		public readonly children: any[]
	) {}
}
