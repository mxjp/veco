# VECO
A toolchain for creating **ve**ctor graphics from **co**de for developers :)

**This is an early proof of concept. Use at your own risk!**

## Why/how?
From a developer's perspective, large sets of svg icons are hard to create and maintain as
even modern graphic software makes it hard to reuse parts or parametize things. Veco solves all
these problems by allowing you to write svgs in typescript:
```tsx
import { render, emit } from "veco";

emit(<svg viewBox="0 0 100 100">
	{[[20, "red"], [40, "blue"], [60, "green"]].map(([radius, fill]) => {
		return <circle cx="50" cy="50" r={radius} fill={fill} />
	})}
</svg>)
```

> **Note:** `emit(..)` will throw when used outside of the veco runtime.

<br>



# Getting started

## Installation
```shell
npm i -D veco
```

## Configuration
Create a configuration file for your project:
```js
// veco.json5
{
	// Note, that all properties are optional and
	// the following values represent the defaults:

	// An object with typescript compiler options:
	compilerOptions: {
		target: "es2019",
		jsxFactory: "render"
	},

	// An array with globs to include:
	include: ["**"],

	// An array with globs to exclude:
	exclude: [],

	// The render target.
	//  - xml - Standalone xml svg files.
	//  - dom - Svg files for direct use in html documents.
	//  - png - PNG images.
	//  - jpeg - JPEG images.
	target: "xml",

	// Render quality used for jpeg images:
	quality: 1,

	// The pixel scale used for PNG and JPEG images:
	scale: 1,

	// An object with format options:
	format: {
		indent: "\t",
		newline: "\n"
	},

	// Settings for the preview server:
	preview: {
		port: 3000,
		address: "::1"
	}
}
```

## Command line
```shell
# Render all svgs:
veco render

# Start the preview server:
veco preview
```

The following arguments can be used to overwrite the configuration:

| Argument | Description | Commands |
|-|-|-|
| `--config ./foo.json5` | Optional config file path | render, preview |
| `--watch` | Watch for changes | render |
| `--include ./src/foo/**` | Specify one or more globs to include files | render, preview |
| `--exclude **/test*` | Specify one or more globs to exclude files | render, preview |
| `--out-dir ./out` | Specify a different output directory | render |
| `--target png` | Specify a different render target | render |
| `--quality 0.84` | Specify a different JPEG render quality | render |
| `--scale 1.234` | Specify a different scale for PNG or JPEG images | render |
| `--preview-port 3000` | Use a different preview server port | preview |
| `--preview-address ::1` | Use a different preview server address | preview |
| `--verbose` | Enable verbose logging | *all* |
