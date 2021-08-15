import { Component, h } from "preact";
import styles from "./breadcrumbs.scss";
import { Text } from "./text";
import { toggle } from "../utility/preact";

export class Breadcrumbs extends Component<{
	segments: any[]
}> {
	public render() {
		return <Text>
			<div class={styles.breadcrumbs}>
				{this.props.segments.map((segment, i, segments) => {
					return <div class={toggle({
						[styles.child]: true
					})}>{segment}</div>;
				})}
			</div>
		</Text>;
	}
}
