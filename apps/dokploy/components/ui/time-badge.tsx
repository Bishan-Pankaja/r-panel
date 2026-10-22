"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export function TimeBadge() {
	const { data: serverTime } = api.server.getServerTime.useQuery(undefined);
	const [time, setTime] = useState<Date | null>(null);

	useEffect(() => {
		if (serverTime?.time) {
			setTime(new Date(serverTime.time));
		}
	}, [serverTime]);

	useEffect(() => {
		const timer = setInterval(() => {
			setTime((prevTime) => {
				if (!prevTime) return null;
				const newTime = new Date(prevTime.getTime() + 1000);
				return newTime;
			});
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	if (!time || !serverTime?.timezone) {
		return null;
	}

	const getUtcOffset = (timeZone: string) => {
		const date = new Date();
		const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
		const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
		const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset));
		const minutes = (Math.abs(offset) * 60) % 60;
		return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}`;
	};

	const formattedTime = new Intl.DateTimeFormat("en-US", {
		timeZone: serverTime.timezone,
		timeStyle: "medium",
		hour12: false,
	}).format(time);

	return (
		<div className="inline-flex items-center rounded-full border border-zinc-800/80 bg-[#1a1a1a] p-[3px] text-[11px] whitespace-nowrap max-w-full overflow-hidden shadow-sm">
			<div className="inline-flex items-center px-2.5 gap-1.5 text-zinc-100">
				<span className="hidden sm:inline font-semibold">Server Time:</span>
				<span className="font-bold tabular-nums tracking-wide">{formattedTime}</span>
			</div>
			<div className="hidden sm:flex items-center text-zinc-400 border border-zinc-800 bg-[#111] rounded-full px-2.5 py-1 font-medium">
				{serverTime.timezone} <span className="mx-1 text-zinc-600">|</span> {getUtcOffset(serverTime.timezone)}
			</div>
		</div>
	);
}
