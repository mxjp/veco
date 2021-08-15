import { h, Component, RenderableProps } from "preact";
import { Layout } from "../components/layout";
import { Content } from "../components/content";
import styles from "./fail-safe.scss";
import { Text } from "../components/text";

interface State {
	readonly error: any;
}

export class FailSafe extends Component<{}, State> {
	public render(props: any, state: State) {
		if (state.error) {
			return <Content>
				<Layout flex="col" spaced>
					<div class={styles.message}>
						<Text>
							A rendering error occurred:
						</Text>
					</div>
					<Text>
						<div class={styles.details}>
							{state.error instanceof ExpectedError ? state.error.message : `${state.error}`}
						</div>
					</Text>
				</Layout>
			</Content>;
		}
		return props.children;
	}

	public componentDidCatch(error: any) {
		this.setState({ error });
	}
}

export class ExpectedError extends Error {
}
