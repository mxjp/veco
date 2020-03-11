import { Component, h } from "preact";
import * as styles from "./layout.scss";
import { toggle } from "../utility/preact";

export class Layout extends Component<{
	fill?: boolean,
	flex?: "row" | "col",
	separator?: boolean,
	grow?: boolean,
	spaced?: boolean,
	anchor?: boolean
}> {
	public render() {
		return <div class={toggle({
			[styles.fill]: this.props.fill,
			[styles.row]: this.props.flex === "row",
			[styles.col]: this.props.flex === "col",
			[styles.separator]: this.props.separator,
			[styles.grow]: this.props.grow,
			[styles.spaced]: this.props.spaced,
			[styles.anchor]: this.props.anchor
		})}>
			{this.props.children}
		</div>;
	}
}
