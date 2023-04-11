import JSONPath from "jsonpath";

export function getFirstValueMatchingPaths(data, paths) {
	for (let path of paths) {
		let values = JSONPath.query(data, path, 1);
		if (values.length > 0)
			return values[0];
	}
	return undefined;
}
