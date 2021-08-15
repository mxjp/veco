import { Component, h } from "preact";
import styles from "./content.scss";

export class Content extends Component {
	public render() {
		return <div class={styles.content}>
			{this.props.children}
		</div>;
	}
}
