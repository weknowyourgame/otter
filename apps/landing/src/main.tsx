import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import AIWidgetMount from "./components/AIWidgetMount";
import Index from "./pages/Index";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<MotionConfig reducedMotion="user">
			<Index />
			<AIWidgetMount />
		</MotionConfig>
	</React.StrictMode>,
);