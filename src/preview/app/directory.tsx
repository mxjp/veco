import { Component, h } from "preact";
import { Layout } from "../components/layout";
import { ReadonlyDir } from "../utility/virtual-store";
import { Content } from "../components/content";
import { Text } from "../components/text";
import { mapToArray } from "../../common/iterables";
import { Link } from "../components/link";
import { router } from "../router";

export class Directory extends Component<{
	value: ReadonlyDir<any>
}> {
	public render() {
		return <Content>
			<Layout spaced>
				{mapToArray(this.props.value.keys(), name => {
					return <Text><Link action={() => {
						router.path = router.path.concat(name)
					}}>{name}</Link></Text>;
				})}
			</Layout>
		</Content>
	}
}
