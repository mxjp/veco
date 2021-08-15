import { Component, h } from "preact";
import styles from "./link.scss";

export class Link extends Component<{
	action?: () => void
}> {
	public render() {
		return <a class={styles.link} onClick={this.props.action}>
			{this.props.children}
		</a>
	}
}
