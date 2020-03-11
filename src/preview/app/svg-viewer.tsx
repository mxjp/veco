import { Component, h, createRef } from "preact";
import * as styles from "./svg-viewer.scss";

export class SvgViewer extends Component<{
	data: string
}, {
}> {
	private container = createRef<HTMLDivElement>();

	public constructor() {
		super();
		this.state = {
		};
	}

	private _renderData(container: HTMLElement) {
		container.innerHTML = this.props.data;
		const viewBox = container.querySelector("svg")?.viewBox?.baseVal;
		if (viewBox) {
			container.style.setProperty("--width", `${viewBox.width}px`);
			container.style.setProperty("--height", `${viewBox.height}px`);
		}
	}

	public render() {
		return <div class={styles.viewport}>
			<div class={styles.center}>
				<div class={styles.container} ref={container => {
					if (container) {
						this._renderData(container);
					}
				}}/>
			</div>
		</div>;
	}
}
