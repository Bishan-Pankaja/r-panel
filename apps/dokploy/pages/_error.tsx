import type { NextPageContext } from "next";
import { useRouter } from "next/router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
	statusCode: number;
	error?: Error;
}

export default function Custom404({ statusCode, error }: Props) {
	const displayStatusCode = statusCode || 400;
	const router = useRouter();
	const isGatewayError = displayStatusCode === 502;
	const title = isGatewayError
		? "This site is temporarily unavailable"
		: displayStatusCode === 404
			? "We couldn’t find that page"
			: "Something went wrong";
	const description = isGatewayError
		? "The service didn’t respond as expected. It may be restarting or temporarily unavailable. Please try again in a moment."
		: "An unexpected error stopped this page from loading. Please try again.";

	return (
		<div className="flex min-h-screen items-center justify-center bg-black px-5 py-12 text-white">
			<main id="content" className="w-full max-w-lg">
				<div className="mb-7 flex items-center justify-center gap-3">
					<img
						src="https://www.regz.lk/favicon.ico"
						alt=""
						width={36}
						height={36}
						className="size-9 rounded-lg object-contain"
					/>
					<span className="text-lg font-semibold tracking-tight">Regz Lk</span>
				</div>
				<section className="rounded-2xl border border-zinc-800/80 bg-[#080808] px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-12 sm:py-12">
					<p className="font-mono text-xs font-semibold tracking-[0.28em] text-blue-300">
						ERROR {displayStatusCode}
					</p>
					<h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
						{title}
					</h1>
					<p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400 sm:text-base">
						{description}
					</p>
					<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
						<Button
							onClick={() => router.reload()}
							className="h-11 rounded-xl bg-blue-600 px-5 font-medium text-white hover:bg-blue-500"
						>
							<RefreshCw className="mr-2 size-4" />
							Try again
						</Button>
						<Button
							variant="outline"
							onClick={() => router.back()}
							className="h-11 rounded-xl border-zinc-800 bg-zinc-900/70 px-5 text-zinc-200 hover:bg-zinc-800 hover:text-white"
						>
							<ArrowLeft className="mr-2 size-4" />
							Go back
						</Button>
					</div>
				</section>
			</main>
		</div>
	);
}

// @ts-ignore
Error.getInitialProps = ({ res, err }: NextPageContext) => {
	const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
	return { statusCode, error: err };
};
