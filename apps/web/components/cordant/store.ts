"use client";

import { useCallback, useEffect, useState } from "react";

// Tiny persistent store so Otter's actions have real, observable consequences
// that survive navigation. localStorage + a custom event so every
// subscribed component re-renders on change.

const PREFIX = "cordant:";
const EVENT = "cordant-store";

export function useStore<T>(key: string, initial: T): [T, (next: T) => void] {
	const storageKey = PREFIX + key;
	const [value, setValue] = useState<T>(initial);

	useEffect(() => {
		const read = () => {
			try {
				const raw = localStorage.getItem(storageKey);
				setValue(raw === null ? initial : (JSON.parse(raw) as T));
			} catch {
				setValue(initial);
			}
		};
		read();
		const onChange = (e: Event) => {
			if ((e as CustomEvent<string>).detail === storageKey) read();
		};
		window.addEventListener(EVENT, onChange);
		return () => window.removeEventListener(EVENT, onChange);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storageKey]);

	const update = useCallback(
		(next: T) => {
			try {
				localStorage.setItem(storageKey, JSON.stringify(next));
			} catch {
				/* private mode — in-memory only */
			}
			setValue(next);
			window.dispatchEvent(new CustomEvent(EVENT, { detail: storageKey }));
		},
		[storageKey],
	);

	return [value, update];
}
