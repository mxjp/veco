import { Component, h } from "preact";
import styles from "./svg-viewer.scss";
import { Layout } from "../components/layout";
import { Content } from "../components/content";
import { Link } from "../components/link";
import { Text } from "../components/text";
import { ExpectedError } from "./fail-safe";
import background from "../assets/svg-viewer-background.svg";

export class SvgViewer extends Component<{
	data?: string
}, {
	x: number,
	y: number,
	zoom: number,
	fitWindow: boolean
}> {
	private _container: HTMLDivElement | null = null;
	private _viewport: HTMLDivElement | null = null;
	private _width: number = 0;
	private _height: number = 0;

	public constructor() {
		super();
		this.state = {
			x: 0,
			y: 0,
			zoom: 1,
			fitWindow: false
		};
	}

	public componentDidMount() {
		window.addEventListener("resize", this._onWindowResize);
	}

	public componentWillUnmount() {
		window.removeEventListener("resize", this._onWindowResize);
	}

	public render() {
		this._renderData(this._container);
		return <Layout grow flex="col" separator>
			<div class={styles.viewer}>
				<div class={styles.viewport} style={{
					backgroundImage: `url("${encodeURIComponent(background)}")`
				}} onMouseDown={this._move} onWheel={this._zoom} ref={this._renderViewport}>
					<div class={styles.center}>
						<div class={styles.container} ref={this._renderData} style={{
							"--x": `${this.state.x}px`,
							"--y": `${this.state.y}px`,
							"--zoom": `${this.state.zoom}`
						}}/>
					</div>
				</div>
			</div>
			<Content>
				<Layout flex="row" spaced>
					<Layout grow/>
					<Text>{Math.floor(this.state.zoom * 100)}%</Text>
					<Text>
						<Link action={this._resetZoom}>Reset</Link>
					</Text>
					<Text>
						<Link action={this._setFitWindow}>Fit window</Link>
					</Text>
					<Layout grow/>
				</Layout>
			</Content>
		</Layout>;
	}

	private _renderViewport = (viewport: HTMLDivElement | null) => {
		this._viewport = viewport;
	}

	private _renderData = (container: HTMLDivElement | null) => {
		if (container && container.innerHTML !== this.props.data) {
			this._container = container;
			if (this.props.data) {
				container.innerHTML = this.props.data;
				container.style.removeProperty("--width");
				container.style.removeProperty("--height");
				const svg = container.querySelector("svg");
				if (svg) {
					svg.removeAttribute("width");
					svg.removeAttribute("height");

					const viewBox = svg.viewBox.baseVal;
					if (!viewBox) {
						throw new ExpectedError("svg element must have a viewBox attribute");
					}
					container.style.setProperty("--width", `${viewBox.width}px`);
					container.style.setProperty("--height", `${viewBox.height}px`);

					this._width = viewBox.width;
					this._height = viewBox.height;
				}
			}
		}
	}

	private _onWindowResize = () => {
		if (this.state.fitWindow) {
			this._fitWindow();
		}
	}

	private _fitWindow() {
		const viewport = this._viewport?.getBoundingClientRect();
		const width = this._width;
		const height = this._height;
		if (viewport && width && height) {
			const zoom = Math.min(viewport.width / width, viewport.height / height) * 0.9;
			this.setState({ zoom });
		}
	}

	private _move = (e: MouseEvent) => {
		e.preventDefault();
		this.setState({ fitWindow: false });

		const baseX = this.state.x;
		const baseY = this.state.y;
		const startX = e.clientX;
		const startY = e.clientY;
		const move = (e: MouseEvent) => {
			this._container?.style.setProperty("--x", `${baseX + e.clientX - startX}px`);
			this._container?.style.setProperty("--y", `${baseY + e.clientY - startY}px`);
		};
		const end = (e: MouseEvent) => {
			window.removeEventListener("mousemove", move, { capture: true });
			window.removeEventListener("mouseup", end, { capture: true });
			this.setState({
				x: baseX + e.clientX - startX,
				y: baseY + e.clientY - startY
			});
		};
		window.addEventListener("mousemove", move, { capture: true });
		window.addEventListener("mouseup", end, { capture: true });
	}

	private _zoom = (e: WheelEvent) => {
		e.preventDefault();
		const speed = e.altKey ? 0.5 : 0.1;
		const start = this.state.zoom;
		const zoomDelta = 1 + (e.deltaY < 0 ? speed : -speed);
		const end = start * zoomDelta;
		const containerRect = this._container?.getBoundingClientRect();
		if (containerRect && e.clientX && e.clientY) {
			const centerX = containerRect.x + containerRect.width / 2;
			const centerY = containerRect.y + containerRect.height / 2;
			const deltaX = e.clientX - centerX;
			const deltaY = e.clientY - centerY;
			this.setState({
				zoom: end,
				x: this.state.x + deltaX - deltaX * zoomDelta,
				y: this.state.y + deltaY - deltaY * zoomDelta,
				fitWindow: false
			})
		} else {
			this.setState({ zoom: end, fitWindow: false });
		}
	}

	private _resetZoom = () => {
		this.setState({ x: 0, y: 0, zoom: 1, fitWindow: false });
	}

	private _setFitWindow = () => {
		this.setState({ x: 0, y: 0, fitWindow: true });
		this._fitWindow();
	}
}
