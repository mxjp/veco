import { Component, h } from "preact";

export class Svg extends Component<{
	data: string | undefined | null
}> {
	private _elem: HTMLDivElement | null = null;

	private _renderData() {
		if (this._elem) {
			this._elem.innerHTML = this.props.data || "";
			const svg = this._elem.querySelector("svg");
			if (svg) {
				const viewBox = svg.viewBox?.baseVal;
				svg.style.maxWidth = `${viewBox.width}px`;
			}
		}
	}

	private _renderDataRef = (elem: HTMLDivElement | null) => {
		this._elem = elem;
		this._renderData();
	}

	public render() {
		this._renderData();
		return <div ref={this._renderDataRef}></div>;
	}
}
