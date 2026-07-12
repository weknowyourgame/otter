import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const AboutSection = () => {
	const ref = useRef<HTMLElement | null>(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	return (
		<section
			id="about"
			ref={ref}
			className="relative bg-[#080B12] py-16 md:py-20 px-4 md:px-6 overflow-hidden"
		>
			<div
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]"
				aria-hidden="true"
			/>
			<div className="relative max-w-[72rem] mx-auto text-center">
				<motion.p
					className="text-white/50 text-xs tracking-widest uppercase mb-4"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					The product promise
				</motion.p>
				<motion.h2
					className="text-2xl md:text-[2.55rem] lg:text-[3rem] text-white leading-[1.08] tracking-tight"
					initial={{ opacity: 0, y: 40 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.8, delay: 0.1 }}
				>
					Support should not end with{" "}
					<span className="font-instrument italic text-white/60">
						a help article and a shrug.
					</span>{" "}
				<br></br>
					It should open the exact screen, focus the right control, and keep the
					user moving{" "}
					<span className="font-instrument italic text-white/60">
						inside the product.
					</span>
				</motion.h2>
			</div>
		</section>
	);
};

export default AboutSection;
