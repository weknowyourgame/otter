import {
	ArrowRight,
	LifeBuoy,
	MessageCircle,
	Route,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import AboutSection from "../components/AboutSection";
import FeaturedVideoSection from "../components/FeaturedVideoSection";
import PhilosophySection from "../components/PhilosophySection";
import ServicesSection from "../components/ServicesSection";

const HERO_VIDEO_URL =
	"/assets/main_hero.mp4";

const FADE_MS = 500;
const FADE_OUT_LEAD_S = 0.55;
const RESTART_DELAY_MS = 100;

type SubmitState = "idle" | "submitting" | "waitlisted" | "approved" | "error";
type AccessState = "idle" | "submitting" | "approved" | "error";

const Index = () => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const restartTimerRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);
	const isFadingOutRef = useRef(false);
	const [email, setEmail] = useState("");
	const [accessEmail, setAccessEmail] = useState("");
	const [accessCode, setAccessCode] = useState("");
	const [submitState, setSubmitState] = useState<SubmitState>("idle");
	const [accessState, setAccessState] = useState<AccessState>("idle");
	const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
	const [formMessage, setFormMessage] = useState("");
	const [accessMessage, setAccessMessage] = useState("");

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const animateOpacity = (from: number, to: number, onDone?: () => void) => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			const start = performance.now();
			const step = (now: number) => {
				const t = Math.min((now - start) / FADE_MS, 1);
				video.style.opacity = String(from + (to - from) * t);
				if (t < 1) {
					rafRef.current = requestAnimationFrame(step);
				} else {
					rafRef.current = null;
					onDone?.();
				}
			};
			rafRef.current = requestAnimationFrame(step);
		};

		const handleCanPlay = () => {
			if (hasStartedRef.current) return;
			hasStartedRef.current = true;
			void video.play().catch(() => {
				/* Autoplay can be blocked; the poster-less black frame is acceptable. */
			});
			animateOpacity(0, 1);
		};

		const handleTimeUpdate = () => {
			if (isFadingOutRef.current || !Number.isFinite(video.duration)) return;
			const remaining = video.duration - video.currentTime;
			if (remaining <= FADE_OUT_LEAD_S) {
				isFadingOutRef.current = true;
				const current = Number.parseFloat(video.style.opacity || "1");
				animateOpacity(current, 0);
			}
		};

		const handleEnded = () => {
			video.style.opacity = "0";
			restartTimerRef.current = window.setTimeout(() => {
				video.currentTime = 0;
				void video.play().catch(() => {});
				isFadingOutRef.current = false;
				animateOpacity(0, 1);
			}, RESTART_DELAY_MS);
		};

		video.addEventListener("canplay", handleCanPlay);
		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("ended", handleEnded);

		return () => {
			video.removeEventListener("canplay", handleCanPlay);
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("ended", handleEnded);
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			if (restartTimerRef.current !== null)
				window.clearTimeout(restartTimerRef.current);
		};
	}, []);

	const handleWaitlistSubmit = async (
		event: FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		setSubmitState("submitting");
		setFormMessage("");

		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email,
					source: "landing",
				}),
			});
			const result = (await response.json()) as {
				ok?: boolean;
				status?: string;
				error?: string;
			};

			if (!response.ok || !result.ok) {
				const message =
					result.error === "invalid_or_used_access_code"
						? "That access code is invalid or already used."
						: result.error === "invalid_email"
							? "Enter a valid email address."
							: "Something went wrong. Try again shortly.";
				setSubmitState("error");
				setFormMessage(message);
				return;
			}

			setSubmitState("waitlisted");
			setFormMessage("You are on the waitlist.");
		} catch {
			setSubmitState("error");
			setFormMessage("Waitlist is not connected yet.");
		}
	};

	const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setAccessState("submitting");
		setAccessMessage("");

		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: accessEmail,
					accessCode,
					source: "early-access",
				}),
			});
			const result = (await response.json()) as {
				ok?: boolean;
				status?: string;
				error?: string;
			};

			if (!response.ok || !result.ok || result.status !== "beta_approved") {
				const message =
					result.error === "invalid_or_used_access_code"
						? "That access code is invalid or already used."
						: result.error === "invalid_email"
							? "Enter a valid email address."
							: "Access could not be confirmed.";
				setAccessState("error");
				setAccessMessage(message);
				return;
			}

			setAccessState("approved");
			setAccessMessage("Access confirmed. You are on the beta list.");
		} catch {
			setAccessState("error");
			setAccessMessage("Early access is not connected yet.");
		}
	};

	return (
		<main className="bg-[#080B12]">
			<section className="min-h-screen overflow-hidden relative flex flex-col">
				<video
					ref={videoRef}
					className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
					src={HERO_VIDEO_URL}
					muted
					autoPlay
					playsInline
					preload="auto"
					style={{ opacity: 0 }}
					aria-hidden="true"
					tabIndex={-1}
				/>
				<div
					className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,18,0.78)_0%,rgba(8,11,18,0.55)_42%,rgba(8,11,18,0.86)_100%)]"
					aria-hidden="true"
				/>

				<header className="relative z-20 px-6 py-6">
					<nav className="max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center">
							<a
								href="#"
								className="flex items-center"
								aria-label="GuideLayer home"
							>
								<span className="text-white text-lg font-semibold tracking-tight">
									GuideLayer
								</span>
							</a>
						</div>
						<button
							type="button"
							onClick={() => {
								setAccessEmail(email);
								setAccessMessage("");
								setAccessState("idle");
								setIsAccessModalOpen(true);
							}}
							className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors"
						>
							Get early access
						</button>
					</nav>
				</header>

				<div className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
					<div className="grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
						<div className="flex max-w-2xl flex-col items-start text-left">
							<div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
								<LifeBuoy size={14} aria-hidden="true" />
								Support-to-product guidance
							</div>
							<h1
								className="mb-5 text-4xl text-white tracking-tight md:text-6xl lg:text-7xl"
								style={{ fontFamily: "'Instrument Serif', serif" }}
							>
								Turn every support question into the exact product action.
							</h1>
							<p className="mb-7 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
								Connect Intercom, Zendesk, Freshdesk, and more. When a user asks
								"where is 2FA?", send them into your app and guide them to the
								right setting with your SDK.
							</p>

							<form
								className="w-full max-w-xl flex flex-col items-stretch gap-2"
								onSubmit={handleWaitlistSubmit}
							>
								<div
									data-ai-action="start-signup"
									className="w-full rounded-full border border-white/20 bg-[#080B12]/50 backdrop-blur-[2px] pl-5 pr-2 py-2 flex items-center gap-3"
								>
									<input
										type="email"
										autoComplete="email"
										placeholder="Work email"
										aria-label="Email address"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/45 text-sm outline-none"
									/>
									<button
										type="submit"
										aria-label="Subscribe"
										disabled={submitState === "submitting"}
										className="bg-cyan-200 rounded-full p-3 text-[#080B12] shrink-0 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
									>
										<ArrowRight size={20} aria-hidden="true" />
									</button>
								</div>
							</form>

							{formMessage && (
								<p
									className={`mt-3 text-xs ${
										submitState === "error" ? "text-red-200" : "text-white/70"
									}`}
									role="status"
								>
									{formMessage}
								</p>
							)}

							<div className="mt-6 flex flex-wrap gap-3 text-xs text-white/60">
								<span>Intercom first</span>
								<span>Zendesk next</span>
								<span>Approval-gated actions</span>
							</div>
						</div>

						<div className="rounded-[28px] border border-white/10 bg-[#0D1320]/85 p-4 shadow-2xl shadow-black/30 backdrop-blur-md md:p-5">
							<div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-white/40">
										Live handoff
									</p>
									<p className="mt-1 text-sm font-medium text-white">
										Intercom conversation
									</p>
								</div>
								<MessageCircle
									className="text-cyan-200"
									size={22}
									aria-hidden="true"
								/>
							</div>
							<div className="space-y-3">
								<div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/10 px-4 py-3 text-sm text-white/80">
									Where do I enable 2FA for my account?
								</div>
								<div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-cyan-200 px-4 py-3 text-sm text-[#09111F]">
									I can open Security Settings and show you the 2FA control.
								</div>
								<div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
									<div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-100">
										<Route size={17} aria-hidden="true" />
										/settings/security
									</div>
									<div className="rounded-xl bg-[#080B12] p-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-white">
												Two-factor authentication
											</span>
											<span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-medium text-[#07140E]">
												Highlighted
											</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2 text-xs text-white/45">
									<ShieldCheck size={15} aria-hidden="true" />
									Clicks and account changes stay approval-gated in the app.
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="relative z-10 flex justify-center gap-4 pb-12">
					{[
						{ label: "Connector", Icon: MessageCircle },
						{ label: "Handoff", Icon: Route },
						{ label: "Safety", Icon: ShieldCheck },
					].map(({ label, Icon }) => (
						<a
							key={label}
							href="#"
							aria-label={label}
							className="rounded-full border border-white/15 bg-[#080B12]/40 p-4 text-white/80 hover:text-white hover:bg-white/5 transition-colors"
						>
							<Icon size={20} aria-hidden="true" />
						</a>
					))}
				</div>
			</section>

			<AboutSection />
			<FeaturedVideoSection />
			<PhilosophySection />
			<ServicesSection />

			<footer className="relative bg-[#080B12] px-6 pb-10 pt-2 overflow-hidden">
				<div className="relative z-10 max-w-6xl mx-auto px-1 py-5 flex flex-col gap-3 border-t border-white/10 md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-white text-lg font-semibold tracking-tight">
							GuideLayer
						</p>
						<p className="text-white/45 text-xs mt-1">
							Support-channel handoffs for complex SaaS products.
						</p>
					</div>
					<div className="flex items-center gap-5 text-xs text-white/55">
						<span>Intercom</span>
						<span>Zendesk</span>
						<span>In-app SDK</span>
					</div>
				</div>
			</footer>

			{isAccessModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B12]/80 px-6 backdrop-blur-md"
					role="dialog"
					aria-modal="true"
					aria-labelledby="early-access-title"
				>
					<div className="liquid-glass w-full max-w-md rounded-[28px] p-6 md:p-8">
						<div className="flex items-start justify-between gap-6">
							<div>
								<p className="text-white/45 text-xs uppercase tracking-[0.22em]">
									Connector beta
								</p>
								<h2
									id="early-access-title"
									className="mt-2 text-2xl text-white tracking-tight"
								>
									Get early access
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setIsAccessModalOpen(false)}
								className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
							>
								Close
							</button>
						</div>

						<form
							className="mt-7 flex flex-col gap-3"
							onSubmit={handleAccessSubmit}
						>
							<input
								type="email"
								autoComplete="email"
								placeholder="Email address"
								aria-label="Early access email address"
								value={accessEmail}
								onChange={(event) => setAccessEmail(event.target.value)}
								className="rounded-full border border-white/20 bg-[#080B12]/30 px-5 py-3 text-sm text-white placeholder:text-white/35 outline-none"
							/>
							<input
								type="text"
								autoComplete="off"
								placeholder="Access code"
								aria-label="Early access code"
								value={accessCode}
								onChange={(event) => setAccessCode(event.target.value)}
								className="rounded-full border border-white/20 bg-[#080B12]/30 px-5 py-3 text-sm uppercase tracking-[0.18em] text-white placeholder:text-white/35 outline-none"
							/>
							<button
								type="submit"
								disabled={accessState === "submitting"}
								className="mt-2 rounded-full bg-cyan-200 px-6 py-3 text-sm font-medium text-[#080B12] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
							>
								{accessState === "submitting"
									? "Checking..."
									: "Confirm access"}
							</button>
						</form>

						{accessMessage && (
							<p
								className={`mt-4 text-sm ${
									accessState === "error" ? "text-red-200" : "text-white/70"
								}`}
								role="status"
							>
								{accessMessage}
							</p>
						)}
					</div>
				</div>
			)}
		</main>
	);
};

export default Index;
