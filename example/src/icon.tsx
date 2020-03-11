import { render, emit } from "../..";
// import { render, emit } from "veco";

function circles(count: number, rotate: number, fill: string, scale: number, radius: number) {
    return new Array(count).fill(0).map((_, r) => {
        return <circle r={r * radius} cx={250 + Math.sin(r / 2 + rotate) * (r * 10) * scale} cy={250 + Math.cos(r / 2 + rotate) * (r * 10) * scale} fill={fill} />;
    });
}

function swatch(count: number, variation: number) {
    return new Array(count).fill(0).map((_, r) => {
        return circles(1 + r, r * 0.4, `hsl(${360 * r / 23}, 100%, 50%)`, 1.25 + (r * 0.08), 1 + Math.sin(Math.PI * r / 7.5));
    });
}

emit(<svg viewBox="0 75 300 500">
    <rect y="75" width="300" height="500" fill="rgb(20, 25, 35)" />
    {swatch(23, 5)}
</svg>);
