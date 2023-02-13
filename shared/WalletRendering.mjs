import AJV from "ajv";
import { getFirstValueMatchingPaths } from "./JSON.mjs";
import { verifyType } from "../shared/Type.mjs";

export function prettifyValue(value) {
	if (value === true)
		return "Yes";

	if (value === false)
		return "No";

	return value;
}

// <https://identity.foundation/wallet-rendering/#display-mapping-object>
export function resolveDisplayMappingObject(displayMappingObject, data) {
	// <https://identity.foundation/wallet-rendering/#using-path>
	if ("path" in displayMappingObject) {
		let fallback = verifyType(displayMappingObject["fallback"], "string");

		let path = verifyType(displayMappingObject["path"], Array.isArray);
		if (path === undefined)
			return fallback;

		let value = getFirstValueMatchingPaths(data, path);
		if (value === undefined)
			return fallback;

		let schema = displayMappingObject["schema"];
		try {
			if (!(new AJV).validate(schema, value))
				return fallback;
		} catch {
			return fallback;
		}

		return prettifyValue(value);
	}

	// <https://identity.foundation/wallet-rendering/#using-text>
	if ("text" in displayMappingObject)
		return verifyType(displayMappingObject["text"], "string");

	return undefined;
}
