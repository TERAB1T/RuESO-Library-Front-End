export const prepareURL = (url: string) => {
	if (import.meta.env.SSR) return `http://localhost:5001/${url.replace(/^\/api/, '')}`;

	return url;
}
