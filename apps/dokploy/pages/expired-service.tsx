import Head from "next/head";

export default function ExpiredServicePage() {
	return (
		<>
			<Head>
				<title>Service unavailable</title>
				<meta name="robots" content="noindex" />
			</Head>
			<main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
				<section className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
					<div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-zinc-700 text-xl text-zinc-300">
						!
					</div>
					<h1 className="text-xl font-semibold">
						Website temporarily unavailable
					</h1>
					<p className="mt-3 text-sm leading-6 text-zinc-400">
						This hosted website is temporarily unavailable. If you manage this
						site, sign in to your hosting account or contact the administrator
						to restore access.
					</p>
				</section>
			</main>
		</>
	);
}
