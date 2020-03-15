import { Element } from "./element";
import * as Color from "color";

interface ColorPropInfo {
	alphaChannelProp?: string;
}

const colorProps = new Map<string, ColorPropInfo>([
	["fill", {
		alphaChannelProp: "fill-opacity"
	}],
	["stroke", {
		alphaChannelProp: "stroke-opacity"
	}]
]);

export function render(
	tagName: string,
	props?: Record<string, any> | null,
	...children: any[]
) {
	const elemProps: Record<string, string> = {};

	for (const [name, value] of props ? Object.entries(props) : []) {
		const colorProp = colorProps.get(name);
		if (colorProp) {
			try {
				const color = new Color(value);
				const alpha = color.alpha();
				if (alpha !== 1) {
					if (colorProp.alphaChannelProp) {
						elemProps[name] = color.hex();
						elemProps[colorProp.alphaChannelProp] = String(alpha);
					} else {
						elemProps[name] = color.toString();
					}
				} else {
					elemProps[name] = color.hex();
				}
				continue;
			} catch {}
		}

		elemProps[name] = String(value);
	}

	// TODO: If props.fill / props.stroke is a color object and it's alpha channel is not 1,
	// set the fill-opacity / stroke-opacity property to the alpha value.

	return new Element(
		tagName,
		elemProps,
		children.flat(Infinity).map(value => {
			return value instanceof Element ? value : String(value);
		})
	);
}
