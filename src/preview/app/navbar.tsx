import { Component, h } from "preact";
import { Content } from "../components/content";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Link } from "../components/link";
import { router } from "../router";
import { Disposable, dispose } from "../../common/disposable";

export class Navbar extends Component {
	private _resources: Disposable[] = [];

	public componentDidMount() {
		this._resources.push(router.hook("update", this.forceUpdate.bind(this)));
	}

	public componentWillUnmount() {
		this._resources.forEach(dispose);
	}

	public render() {
		return <Content>
			<Breadcrumbs segments={[
				router.path.length > 0 ? <Link action={() => this._open([])}>root</Link> : "root",
				...router.path.map((name, i, path) => {
					return i < path.length - 1
						? <Link action={() => this._open(path.slice(0, i + 1))}>{name}</Link>
						: name
				})
			]}/>
		</Content>;
	}

	private _open(path: string[]) {
		router.path = path;
	}
}
