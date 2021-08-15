import { Component, h } from "preact";
import styles from "./text.scss";

export class Text extends Component {
	public render() {
		return <div class={styles.text}>
			{this.props.children}
		</div>;
	}
}
