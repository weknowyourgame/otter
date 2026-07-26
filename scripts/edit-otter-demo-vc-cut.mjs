#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const artifactRoot = resolve(
	"demo-artifacts/otter-demo-2026-07-26T13-19-16-648Z",
);
const source = join(artifactRoot, "video/otter-product-demo.mp4");
const screenshotsDir = join(artifactRoot, "screenshots");
const authenticatedDashboardDir = join(
	artifactRoot,
	"editor/dashboard-authenticated",
);
const outputDir = join(artifactRoot, "video");
const output = join(outputDir, "otter-vc-launch-cut.mp4");
const contactSheet = join(outputDir, "otter-vc-launch-cut-contact.jpg");

const segments = [
	{
		start: 8,
		end: 37,
		speed: 2.0,
		title: "Create workspace",
		subtitle: "Alex Morgan sets up Cordant in Otter",
	},
	{
		start: 38,
		end: 50,
		speed: 1.3,
		title: "Connect website",
		subtitle: "A support agent gets a secure home",
	},
	{
		start: 54,
		end: 69,
		speed: 1.15,
		title: "Configure agent",
		subtitle: "Friendly concise and professional",
	},
	{
		start: 72,
		end: 88,
		speed: 1.25,
		title: "Train knowledge",
		subtitle: "FAQ docs and website context become searchable",
	},
	{
		start: 89,
		end: 96,
		speed: 1.1,
		title: "Open customer app",
		subtitle: "Cordant feels like a real SaaS",
	},
	{
		start: 96,
		end: 128,
		speed: 1.05,
		title: "Resolve password reset",
		subtitle: "Otter answers then takes action with permission",
	},
	{
		start: 128,
		end: 141,
		speed: 1.0,
		title: "Change notifications",
		subtitle: "The agent navigates to the right setting",
	},
	{
		start: 143,
		end: 155,
		speed: 1.0,
		title: "Open Apollo",
		subtitle: "Project navigation with customer context",
	},
	{
		start: 160,
		end: 225,
		speed: 1.45,
		title: "Create automation",
		subtitle: "A multi step workflow completed in product",
	},
	{
		start: 232,
		end: 245,
		speed: 1.0,
		title: "Remember preferences",
		subtitle: "Sarah prefers email notifications",
	},
];

function dashboardStill(name, fallbackName) {
	const authenticated = join(authenticatedDashboardDir, name);
	return existsSync(authenticated)
		? authenticated
		: join(screenshotsDir, fallbackName);
}

const stills = [
	{
		file: dashboardStill("dashboard-sessions.png", "27-dashboard-sessions.png"),
		duration: 3.4,
		title: "Dashboard proof",
		subtitle: "Conversation history syncs back to Otter",
	},
	{
		file: dashboardStill(
			"dashboard-knowledge.png",
			"28-dashboard-knowledge.png",
		),
		duration: 3.1,
		title: "Knowledge proof",
		subtitle: "Training sources stay visible and ready",
	},
	{
		file: dashboardStill("dashboard-usage.png", "29-dashboard-usage.png"),
		duration: 3.1,
		title: "Usage proof",
		subtitle: "Sessions messages and automations are measurable",
	},
];

if (!existsSync(source)) {
	throw new Error(`Missing source recording: ${source}`);
}
for (const still of stills) {
	if (!existsSync(still.file)) {
		throw new Error(`Missing dashboard still: ${still.file}`);
	}
}

mkdirSync(dirname(output), { recursive: true });

const titleDuration = 3.4;
const outroDuration = 3.2;

function escapeText(text) {
	return text
		.replaceAll("\\", "\\\\")
		.replaceAll(":", "\\:")
		.replaceAll("'", "\\'")
		.replaceAll(",", "\\,")
		.replaceAll("[", "\\[")
		.replaceAll("]", "\\]");
}

function card(label, duration, primary, secondary, tertiary) {
	const chain = [
		`color=c=#05070d:s=1440x900:d=${duration.toFixed(3)},setsar=1,fps=30,format=yuv420p`,
		`drawbox=x=0:y=0:w=1440:h=900:color=#0a1020@0.45:t=fill`,
		`drawbox=x=0:y=0:w=1440:h=900:color=#111827@0.12:t=fill`,
		`drawtext=text='${escapeText(primary)}':x=(w-text_w)/2:y=342:fontsize=80:fontcolor=#ffffff`,
		`drawtext=text='${escapeText(secondary)}':x=(w-text_w)/2:y=444:fontsize=30:fontcolor=#cbd5e1`,
		`drawtext=text='${escapeText(tertiary)}':x=(w-text_w)/2:y=514:fontsize=22:fontcolor=#8b96a8`,
	].join(",");

	return `${chain}[${label}]`;
}

const filters = [
	card(
		"title",
		titleDuration,
		"Otter",
		"AI support that actually does the work",
		"Train. Embed. Resolve.",
	),
];

let timeline = titleDuration;
const labelWindows = [];
const segmentLabels = [];

segments.forEach((segment, index) => {
	const label = `v${index + 1}`;
	segmentLabels.push(`[${label}]`);
	const duration = (segment.end - segment.start) / segment.speed;
	labelWindows.push({
		...segment,
		from: timeline + 0.35,
		to: timeline + duration - 0.3,
	});
	timeline += duration;

	filters.push(
		`${[
			`[0:v]trim=start=${segment.start}:end=${segment.end}`,
			`setpts=(PTS-STARTPTS)/${segment.speed}`,
			"crop=1440:856:0:44",
			"scale=1440:900:flags=lanczos",
			"setsar=1",
			"fps=30",
			"format=yuv420p",
		].join(",")}[${label}]`,
	);
});

stills.forEach((still, index) => {
	const inputIndex = index + 1;
	const label = `still${index + 1}`;
	segmentLabels.push(`[${label}]`);
	labelWindows.push({
		...still,
		from: timeline + 0.25,
		to: timeline + still.duration - 0.25,
	});
	timeline += still.duration;

	filters.push(
		`[${inputIndex}:v]scale=1440:900:force_original_aspect_ratio=increase,crop=1440:900,setsar=1,fps=30,format=yuv420p[${label}]`,
	);
});

filters.push(
	card(
		"outro",
		outroDuration,
		"Otter",
		"Every customer interaction becomes product intelligence",
		"Dashboard ready. Knowledge ready. Demo ready.",
	),
);

filters.push(
	`[title]${segmentLabels.join("")}[outro]concat=n=${
		segments.length + stills.length + 2
	}:v=1:a=0,fps=30,format=yuv420p[seq]`,
);

filters.push(
	[
		"[seq]split=2[bg][fg]",
		"[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=30,eq=brightness=-0.10:saturation=0.78[bg2]",
		"[fg]scale=1728:1080:flags=lanczos,setsar=1[fg2]",
		"[bg2][fg2]overlay=96:0,drawbox=x=96:y=0:w=1728:h=1080:color=white@0.08:t=2,drawbox=x=0:y=0:w=1920:h=1080:color=black@0.035:t=fill[base0]",
	].join(";"),
);

let current = "base0";
let overlayIndex = 0;
for (const label of labelWindows) {
	const nextBox = `lb${overlayIndex}`;
	const nextTitle = `lt${overlayIndex}`;
	const nextSub = `ls${overlayIndex}`;
	const enable = `between(t\\,${label.from.toFixed(2)}\\,${label.to.toFixed(2)})`;
	filters.push(
		`[${current}]drawbox=x=138:y=900:w=650:h=112:color=black@0.52:t=fill:enable='${enable}'[${nextBox}]`,
	);
	filters.push(
		`[${nextBox}]drawtext=text='${escapeText(label.title)}':x=166:y=926:fontsize=30:fontcolor=#ffffff:enable='${enable}'[${nextTitle}]`,
	);
	filters.push(
		`[${nextTitle}]drawtext=text='${escapeText(label.subtitle)}':x=166:y=966:fontsize=20:fontcolor=#cbd5e1:enable='${enable}'[${nextSub}]`,
	);
	current = nextSub;
	overlayIndex += 1;
}

filters.push(
	`[${current}]fade=t=in:st=0:d=0.45,fade=t=out:st=${(
		timeline + outroDuration - 0.7
	).toFixed(2)}:d=0.7[vout]`,
);

execFileSync(
	"ffmpeg",
	[
		"-y",
		"-i",
		source,
		...stills.flatMap((still) => [
			"-loop",
			"1",
			"-t",
			still.duration.toFixed(3),
			"-i",
			still.file,
		]),
		"-filter_complex",
		filters.join(";"),
		"-map",
		"[vout]",
		"-an",
		"-c:v",
		"libx264",
		"-preset",
		"slow",
		"-crf",
		"18",
		"-pix_fmt",
		"yuv420p",
		"-movflags",
		"+faststart",
		output,
	],
	{ stdio: "inherit" },
);

execFileSync(
	"ffmpeg",
	[
		"-y",
		"-i",
		output,
		"-vf",
		"fps=1/10,scale=480:-1,tile=4x5",
		"-update",
		"1",
		"-frames:v",
		"1",
		contactSheet,
	],
	{ stdio: "inherit" },
);

console.log(`Wrote ${output}`);
console.log(`Wrote ${contactSheet}`);
