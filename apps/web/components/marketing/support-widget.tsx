"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { OttoMark } from "./logo";

type ChatMessage = {
	id: number;
	role: "agent" | "visitor";
	text: string;
};

type SupportWidgetProps = {
	embedded?: boolean;
	defaultOpen?: boolean;
	className?: string;
};

function getGreeting() {
	const hour = new Date().getHours();
	if (hour < 12) return "Morning";
	if (hour < 18) return "Afternoon";
	return "Evening";
}

export function SupportWidget({
	embedded = false,
	defaultOpen = false,
	className = "",
}: SupportWidgetProps) {
	const [open, setOpen] = useState(defaultOpen);
	const [view, setView] = useState<"home" | "conversation">("home");
	const [input, setInput] = useState("");
	const [typing, setTyping] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: 1,
			role: "agent",
			text: "Hey - tell me what you are working on and I will help you get it done.",
		},
	]);
	const nextId = useRef(2);
	const timer = useRef<number | null>(null);
	const greeting = useMemo(getGreeting, []);

	useEffect(
		() => () => {
			if (timer.current) window.clearTimeout(timer.current);
		},
		[],
	);

	const sendMessage = (event: FormEvent) => {
		event.preventDefault();
		const text = input.trim();
		if (!text || typing) return;
		setMessages((current) => [...current, { id: nextId.current++, role: "visitor", text }]);
		setInput("");
		setTyping(true);
		timer.current = window.setTimeout(() => {
			setMessages((current) => [
				...current,
				{
					id: nextId.current++,
					role: "agent",
					text: "I have the context. I can walk through the next step with you right here.",
				},
			]);
			setTyping(false);
		}, 1100);
	};

	return (
		<div
			className={`mk-widget-root ${className}`}
			data-embedded={embedded ? "true" : "false"}
			data-open={open ? "true" : "false"}
		>
			<div aria-hidden={!open} className="mk-widget-panel" data-open={open ? "true" : "false"}>
				{view === "home" ? (
					<>
						<header className="mk-widget-header mk-widget-header-home">
							<div className="mk-widget-avatars" aria-label="Support team online">
								<img alt="Support agent" src="/marketing/anthony-picture.jpg" />
								<span className="mk-widget-avatar-mark">
									<OttoMark />
								</span>
							</div>
							<button aria-label="Close support" className="mk-icon-button" onClick={() => setOpen(false)} type="button">
								×
							</button>
						</header>
						<div className="mk-widget-home-copy">
							<h2>{greeting}, how can we help?</h2>
						</div>
						<div className="mk-widget-home-action">
							<button className="mk-widget-question" onClick={() => setView("conversation")} type="button">
								<span>Ask us a question</span>
								<span aria-hidden="true">›</span>
							</button>
							<div className="mk-widget-powered">
								<span>We run on</span>
								<OttoMark />
							</div>
						</div>
					</>
				) : (
					<div className="mk-widget-conversation">
						<header className="mk-widget-header mk-widget-conversation-header">
							<button aria-label="Back" className="mk-icon-button" onClick={() => setView("home")} type="button">
								←
							</button>
							<div>
								<strong>Otto Support</strong>
								<span><i /> Online now</span>
							</div>
							<button aria-label="Close support" className="mk-icon-button" onClick={() => setOpen(false)} type="button">
								×
							</button>
						</header>
						<div aria-label="Conversation timeline" className="mk-widget-messages" role="log">
							{messages.map((message) => (
								<div className={`mk-chat-message mk-chat-${message.role}`} key={message.id}>
									{message.role === "agent" && (
										<span className="mk-message-avatar"><OttoMark /></span>
									)}
									<p>{message.text}</p>
								</div>
							))}
							{typing && (
								<div className="mk-chat-message mk-chat-agent">
									<span className="mk-message-avatar"><OttoMark /></span>
									<span className="mk-typing" aria-label="Otto is typing"><i /><i /><i /></span>
								</div>
							)}
						</div>
						<form className="mk-widget-composer" onSubmit={sendMessage}>
							<textarea
								aria-label="Message"
								onChange={(event) => setInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.shiftKey) {
										event.preventDefault();
										event.currentTarget.form?.requestSubmit();
									}
								}}
								placeholder="Write a message..."
								rows={2}
								value={input}
							/>
							<div>
								<span className="mk-widget-powered"><span>We run on</span><OttoMark /></span>
								<button aria-label="Send message" disabled={!input.trim() || typing} type="submit">↑</button>
							</div>
						</form>
					</div>
				)}
			</div>

			<button
				aria-expanded={open}
				aria-label={open ? "Close support" : "Open support"}
				className="mk-widget-bubble"
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{open ? <span className="mk-widget-chevron">⌄</span> : <OttoMark />}
				{!open && <span className="mk-widget-ping" />}
			</button>
		</div>
	);
}
