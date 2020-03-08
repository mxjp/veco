import "./styles.scss";
import { render, h } from "preact";
import { App } from "./app";

window.addEventListener("load", () => {
	render(<App/>, document.body);
});
