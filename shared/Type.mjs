export function verifyType(value, typeOrValidator) {
	if (typeof typeOrValidator === "string" && typeof value !== typeOrValidator)
		return undefined;
	if (typeof typeOrValidator === "function" && !typeOrValidator(value))
		return undefined;
	return value;
}
