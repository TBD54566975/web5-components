import AJV from "ajv";
import JSONPath from "jsonpath";
import { LitElement, css, html, nothing } from "lit";
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';
import { when } from "lit/directives/when.js";

const VERSION = "https://identity.foundation/credential-manifest/spec/v1.0.0/";

function isURL(string) {
	try {
		new URL(string);
	} catch {
		return false;
	}
	return true;
}

function verifyType(value, typeOrValidator) {
	if (typeof typeOrValidator === "string" && typeof value !== typeOrValidator)
		return undefined;
	if (typeof typeOrValidator === "function" && !typeOrValidator(value))
		return undefined;
	return value;
}

function isHexColor(value) {
	return /^#[0-9A-F]{6}$/i.test(value);
}

export class VerifiableCredential extends LitElement {
	static properties = {
		src: { type: String, attribute: "src" },
		data: { type: Object, attribute: false },

		manifest: { type: String, attribute: "manifest" },
	};

	static styles = css`
.descriptor {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	position: relative;
	max-width: min(100%, calc(var(--hero-width, 100%) * 1px));
	max-height: min(100%, calc(var(--hero-height, 100%) * 1px));
	aspect-ratio: var(--hero-width, 1) / var(--hero-height, 1);
	padding: 1em;
}

.thumbnail {
	position: absolute;
	top: 1em;
	left: 1em;
	z-index: 2;
	max-width: 32px;
	max-height: 32px;
}

.hero {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 1;
	max-width: 100%;
	max-height: 100%;
}

.title {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.subtitle {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.description {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0.5em 0 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.properties {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0.5em 0 0;
}

.property {
	list-style-type: none;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.property::before {
	margin: 0 0.3em 0 0.5em;
	content: "\\2022";
}
`;

	static shadowRootOptions = {
		...LitElement.shadowRootOptions,
		mode: "closed",
	};

	shouldUpdate(changedProperties) {
		let shouldUpdate = true;

		if (changedProperties.has("src")) {
			shouldUpdate = false;

			fetch(this.src)
				.then((response) => response.json())
				.then((json) => {
					this.data = json;
				});
		}

		if (changedProperties.has("manifest") && typeof this.manifest === "string") {
			shouldUpdate = false;

			fetch(this.manifest)
				.then((response) => response.json())
				.then((json) => {
					this.manifest = json;
				});
		}

		return shouldUpdate;
	}

	render() {
		if (typeof this.data !== "object" || typeof this.manifest !== "object")
			return nothing;

		if (this.manifest["spec_version"] !== VERSION)
			return nothing;

		return html`${map(this.manifest["output_descriptors"], (descriptor) => {
			if (!descriptor)
				return nothing;

			let thumbnailURI = verifyType(descriptor?.["styles"]?.["thumbnail"]?.["uri"], "string");
			let thumbnailAlt = verifyType(descriptor?.["styles"]?.["thumbnail"]?.["alt"], "string");
			let heroURI = verifyType(descriptor?.["styles"]?.["hero"]?.["uri"], "string");
			let heroAlt = verifyType(descriptor?.["styles"]?.["hero"]?.["alt"], "string");
			let backgroundColor = verifyType(descriptor?.["styles"]?.["background"]?.["color"], isHexColor);
			let textColor = verifyType(descriptor?.["styles"]?.["text"]?.["color"], isHexColor);

			let style = "";
			if (textColor)
				style += `color:${textColor};`;
			if (backgroundColor)
				style += `background-color:${backgroundColor};`;

			let title = this.#getValue(descriptor?.["display"]?.["title"]);
			let subtitle = this.#getValue(descriptor?.["display"]?.["subtitle"]);
			let description = this.#getValue(descriptor?.["display"]?.["description"]);

			return html`
<section class="descriptor" style="${ifDefined(style)}">
	${when(isURL(thumbnailURI), () => html`<img class="thumbnail" src="${thumbnailURI}" alt="${ifDefined(thumbnailAlt)}" hidden @load=${this.#handleThumbnailLoad} @error=${this.#handleError}>`)}
	${when(isURL(heroURI), () => html`<img class="hero" src="${heroURI}" alt="${ifDefined(heroAlt)}" hidden @load=${this.#handleHeroLoad} @error=${this.#handleError}>`)}
	${when(title, () => html`<h1 class="title">${title}</h1>`)}
	${when(subtitle, () => html`<h2 class="subtitle">${subtitle}</h2>`)}
	${when(description, () => html`<p class="description">${description}</p>`)}
	<ul class="properties">
		${map(descriptor?.["display"]?.["properties"], (property) => {
			let label = property?.["label"];

			let value = this.#getValue(property);

			return html`
		<li class="property">
			${when(label, () => html`<span class="label">${label}</span>`)}
			${when(value, () => html`<span class="value">${value}</span>`)}
		</li>
`;
		})}
	</ul>
</section>
`;
		})}`;
	}

	#getValue(descriptor) {
		if (descriptor === undefined)
			return undefined;

		if ("text" in descriptor)
			return verifyType(descriptor["text"], "string");

		if ("path" in descriptor) {
			let fallback = verifyType(descriptor["fallback"], "string");

			let path = verifyType(descriptor["path"], Array.isArray);
			if (path === undefined)
				return fallback;

			let value = this.#getFirstMatchingValue(path);
			if (value === undefined)
				return fallback;

			let schema = descriptor["schema"];
			try {
				if (!(new AJV).validate(schema, value))
					return fallback;
			} catch {
				return fallback;
			}

			return this.#formatValue(value);
		}

		return undefined;
	}

	#getFirstMatchingValue(paths) {
		for (let path of paths) {
			let values = JSONPath.query(this.data, path, 1);
			if (values.length > 0)
				return values[0];
		}
		return undefined;
	}

	#formatValue(value) {
		if (value === true)
			return "Yes";

		if (value === false)
			return "No";

		return value;
	}

	#handleThumbnailLoad(event) {
		event.target.hidden = false;
	}

	#handleHeroLoad(event) {
		let width = event.target.naturalWidth;
		let height = event.target.naturalHeight;

		event.target.hidden = false;

		let descriptorElement = event.target.parentElement;
		descriptorElement.style.setProperty("--hero-width", width);
		descriptorElement.style.setProperty("--hero-height", height);
	}

	#handleError(event) {
		event.target.remove();
	}
}
customElements.define("verifiable-credential", VerifiableCredential);
