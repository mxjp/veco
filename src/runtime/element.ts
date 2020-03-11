
export class Element {
	public constructor(
		public tagName: string,
		public props: Record<string, any>,
		public children: any[]
	) {}
}
