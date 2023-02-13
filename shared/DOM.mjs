export function convertBooleanAttribute(value) {
	if (value === "")
		return true;
	return !!value;
}

export function hideUntilLoad(element, callback) {
	element.hidden = true;
	element.addEventListener("load", (event) => {
		callback?.();

		element.hidden = false;
	});
	element.addEventListener("error", (event) => {
		element.remove();
	});
}
