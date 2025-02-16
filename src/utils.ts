export const prepareURL = (url: string) => {
	if (import.meta.env.SSR) return `http://localhost:8000/${url.replace(/^\/api/, '')}`;

	return url;
}
