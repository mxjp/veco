import { render, emit } from "../..";
// import { render, emit } from "veco";

function circles(count: number, rotate: number, fill: string, scale: number, radius: number) {
    return new Array(count).fill(0).map((_, r) => {
        return <circle r={r * radius} cx={250 + Math.sin(r / 2 + rotate) * (r * 10) * scale} cy={250 + Math.cos(r / 2 + rotate) * (r * 10) * scale} fill={fill} />;
    });
}

function swatch(count: number) {
    return new Array(count).fill(0).map((_, r) => {
        return circles(1 + r, r * 0.4, `hsl(${360 * r / 23}, 100%, 50%)`, 1.25 + (r * 0.08), 1 + Math.sin(Math.PI * r / 7.5));
    });
}

emit(<svg viewBox="0 75 300 500">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="rgb(10, 15, 20)"/>
            <stop offset="1" stop-color="rgb(30, 35, 40)"/>
        </linearGradient>
    </defs>
    <rect y="75" width="300" height="500" fill="url(#bg)" />
    {swatch(23)}
</svg>);
