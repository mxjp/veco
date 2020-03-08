import { Component, h } from "preact";
import * as styles from "./app.scss";
import { client } from "./client";
import { Disposable, dispose } from "../common/disposable";
import { mapToArray } from "../common/iterables";
import { Svg } from "./svg";

export class App extends Component<{}, {
	current: string | null
}> {
	private _updateHook?: Disposable;

	public constructor() {
		super();
		this.state = {
			current: null
		};
	}

	public componentDidMount() {
		this._updateHook = client.hook("update", this.forceUpdate.bind(this));
	}

	public componentWillUnmount() {
		dispose(this._updateHook);
	}

	public render() {
		const current = client.svgs.get(this.state.current!);

		return <div class={styles.app}>
			{/* TODO: Show view controls */}

			{current ? <Svg data={current} /> : null}

			{/* TODO: Show tree view with files: */}
			<div>{mapToArray(client.svgs.keys(), filename => {
				return <button onClick={() => this.setState({
					current: filename
				})} type="button">{filename}</button>;
			})}</div>
		</div>;
	}
}
