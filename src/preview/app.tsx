import { Component, h } from "preact";
import * as styles from "./app.scss";
import { client } from "./client";
import { Disposable, dispose } from "../common/disposable";

export class App extends Component {
	private _updateHook?: Disposable;

	public componentDidMount() {
		this._updateHook = client.hook("update", () => {
			// TODO: Set state using client.svgs
		});
	}

	public componentWillUnmount() {
		dispose(this._updateHook);
	}

	public render() {
		return <div class={styles.app}>
		</div>;
	}
}
