import React from 'react'

export default function LegacySiteRedirectPlaceholder() {
	// This page intentionally minimal; middleware or redirects may handle /site.
	return (
		<main className="p-8">
			<h1 className="text-2xl font-semibold">Legacy /site</h1>
			<p className="mt-2 text-sm text-slate-600">This placeholder exists to satisfy build/type checks. The route may redirect or be deprecated.</p>
		</main>
	)
}

