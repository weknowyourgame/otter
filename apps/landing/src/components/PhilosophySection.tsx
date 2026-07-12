import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const PHILOSOPHY_VIDEO_URL =
	"/assets/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";

const TEXT_BLOCKS = [
	{
		label: "Support-channel connector",
		body: "Intercom, Zendesk, and other tools send inbound questions to your backend. The connector replies with a guided link instead of another generic article.",
	},
	{
		label: "In-app execution SDK",
		body: "The installed SDK reads the handoff, navigates to the right route, highlights the target, and only clicks after the user explicitly approves the action.",
	},
];

const PhilosophySection = () => {
	const ref = useRef<HTMLElement | null>(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	return (
		<section ref={ref} className="bg-[#080B12] py-28 md:py-40 px-6 overflow-hidden">
			<div className="max-w-6xl mx-auto">
				<motion.h2
					className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24"
					initial={{ opacity: 0, y: 40 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.8 }}
				>
					Connector{" "}
					<span className="font-instrument italic text-white/40">meets</span>{" "}
					product guidance
				</motion.h2>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
					<motion.div
						className="rounded-3xl overflow-hidden aspect-[4/3]"
						initial={{ opacity: 0, x: -40 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.8, delay: 0.1 }}
					>
						<video
							className="w-full h-full object-cover"
							src={PHILOSOPHY_VIDEO_URL}
							muted
							autoPlay
							loop
							playsInline
							preload="auto"
							aria-hidden="true"
							tabIndex={-1}
						/>
					</motion.div>

					<motion.div
						className="flex flex-col justify-center"
						initial={{ opacity: 0, x: 40 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						{TEXT_BLOCKS.map((block, index) => (
							<div key={block.label}>
								{index > 0 && (
									<div
										className="w-full h-px bg-white/10 my-10"
										aria-hidden="true"
									/>
								)}
								<p className="text-white/40 text-xs tracking-widest uppercase mb-4">
									{block.label}
								</p>
								<p className="text-white/70 text-base md:text-lg leading-relaxed">
									{block.body}
								</p>
							</div>
						))}
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default PhilosophySection;
