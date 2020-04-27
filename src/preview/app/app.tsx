import { Component, h } from "preact";
import { client } from "../client";
import { Disposable, dispose } from "../../common/disposable";
import { router } from "../router";
import { Layout } from "../components/layout";
import { Navbar } from "./navbar";
import { Directory } from "./directory";
import { SvgViewer } from "./svg-viewer";
import { ReadonlyDirEntry } from "../utility/virtual-store";
import { FailSafe } from "./fail-safe";

export interface AppState {
	route?: ReadonlyDirEntry<string>,
	data?: string
}

export class App extends Component<{}, AppState> {
	private _resources: Disposable[] = [];

	public componentDidMount() {
		this._resources.push(
			client.hook("update", this.forceUpdate.bind(this)),
			router.hook("update", this.forceUpdate.bind(this))
		);
	}

	public componentWillUnmount() {
		this._resources.forEach(dispose);
	}

	public render(props: any, state: AppState) {
		const current = client.svgs.get(router.pathStr);
		return <Layout fill flex="col" separator>
			<Navbar/>
			{current && current[0] === "dir" && <Directory value={current[1] as any}/>}
			{current && current[0] === "val" && <FailSafe>
				<SvgViewer data={current[1]}/>
			</FailSafe>}
		</Layout>;
	}
}
