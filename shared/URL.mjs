export function isURL(string) {
	try {
		new URL(string);
	} catch {
		return false;
	}
	return true;
}
