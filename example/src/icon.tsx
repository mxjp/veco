import { render, emit } from "../..";

emit(<svg viewBox="0 0 50 100">
	{[1, 2, 3, 4].map(r => <circle r={r} />)}
</svg>);
