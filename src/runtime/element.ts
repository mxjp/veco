
export type ElementChild = Element | string;

export class Element {
	public constructor(
		public tagName: string,
		public props: Record<string, string>,
		public children: ElementChild[]
	) {}
}
