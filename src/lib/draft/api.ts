export async function draftFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
	const res = await fetch(input, init);
	if (res.status === 401) {
		const data = await res.clone().json().catch(() => ({}));
		if (data.error === 'NoToken') {
			window.location.href = '/auth/github';
			return new Promise(() => {});
		}
	}
	return res;
}
