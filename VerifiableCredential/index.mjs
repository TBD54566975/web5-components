import AJV from "ajv";
import JSONPath from "jsonpath";
import QRCode from "qrcode";

const VERSION = "https://identity.foundation/credential-manifest/spec/v1.0.0/";

const STYLE_SPACING = "1.5em";
const STYLE = `
img {
	max-width: 100%;
	max-height: 100%;
}

:host > :not(:first-of-type) {
	padding-top: calc(${STYLE_SPACING} / 2);
	border-top-right-radius: 0;
	border-top-left-radius: 0;
}

:host > :not(:last-of-type) {
	padding-bottom: calc(${STYLE_SPACING} / 2);
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}

.issuer {
	box-sizing: border-box;
	position: relative;
	padding: ${STYLE_SPACING};
	border-radius: inherit;
}

.descriptor {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	position: relative;
	padding: ${STYLE_SPACING};
	border-radius: inherit;
}

:is(.issuer, .descriptor) .thumbnail {
	z-index: 2;
	max-width: 32px;
	max-height: 32px;
}

:is(.issuer, .descriptor) .hero {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 1;
	max-width: 100%;
	max-height: 100%;
}

.issuer .name {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
	font-size: 0.8em;
}

.descriptor .title {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
	font-size: 1.5em;
}

.descriptor .subtitle {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
	font-size: 1em;
	font-weight: normal;
}

.descriptor .description {
	position: relative;
	z-index: 3;
	margin: 0;
	padding: 0;
}

.descriptor .description:not(:first-child) {
	padding-top: ${STYLE_SPACING};
}

.descriptor .properties {
	display: flex;
	flex-wrap: wrap;
	gap: ${STYLE_SPACING};
	z-index: 3;
	margin: 0;
	padding: 0;
}

.descriptor .properties:not(:first-child) {
	padding-top: ${STYLE_SPACING};
}

.descriptor .properties .property {
	width: calc(50% - (${STYLE_SPACING} / 2));
	list-style-type: none;
}

.descriptor .description .label,
.descriptor .properties .property .label {
	display: block;
	margin-bottom: 0.25em;
	font-size: 0.5em;
	text-transform: uppercase;
	opacity: 0.5;
}

.qr {
	margin-top: ${STYLE_SPACING};
}

slot {
	display: none;
}
`;

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

function convertBooleanAttribute(value) {
	if (value === "")
		return true;
	return !!value;
}

export class VerifiableCredential extends HTMLElement {
	static #style = null;

	#data = null;
	#srcFetchAbortController = null;

	#manifest = null;
	#manifestFetchAbortController = null;

	#root;

	constructor() {
		super();

		this.#root = this.attachShadow({ mode: "closed" });

		if (this.#root.adoptedStyleSheets) {
			if (!VerifiableCredential.#style) {
				VerifiableCredential.#style = new CSSStyleSheet;
				VerifiableCredential.#style.replaceSync(STYLE);
			}
			this.#root.adoptedStyleSheets = [ VerifiableCredential.#style ];
		} else {
			if (!VerifiableCredential.#style) {
				VerifiableCredential.#style = document.createElement("style");
				VerifiableCredential.#style.textContent = STYLE;
			}
		}
	}

	get src() {
		return this.getAttribute("src");
	}
	set src(src) {
		if (typeof src === "string")
			this.setAttribute("src", src);
	}

	get data() { return this.#data; }
	set data(data) {
		if (!data || typeof data !== "object")
			return;

		if (this.#srcFetchAbortController) {
			this.#srcFetchAbortController.abort();
			this.#srcFetchAbortController = null;
		}

		this.#data = data;
		this.#update();
	}

	get manifest() { return this.#manifest; }
	set manifest(manifest) {
		if (typeof manifest === "string") {
			this.setAttribute("manifest", manifest);
			return;
		}

		if (!manifest || typeof manifest !== "object")
			return;

		if (this.#manifestFetchAbortController) {
			this.#manifestFetchAbortController.abort();
			this.#manifestFetchAbortController = null;
		}

		this.#manifest = manifest;
		this.#update();
	}

	get showQR() {
		return this.hasAttribute("show-qr");
	}
	set showQR(showQR) {
		this.toggleAttribute("show-qr", !!showQR);
	}

	static observedAttributes = [
		"src",
		"manifest",
		"show-qr",
	];
	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
		case "src":
			this.#srcFetchAbortController?.abort();
			this.#srcFetchAbortController = new AbortController;

			fetch(newValue, { signal: this.#srcFetchAbortController.signal })
				.then((response) => response.json())
				.then((json) => {
					this.data = json;
				})
				.catch((error) => {
					if (error.name !== "AbortError")
						throw error; // surface `fetch` errors for developers
				});
			return;

		case "manifest":
			this.#manifestFetchAbortController?.abort();
			this.#manifestFetchAbortController = new AbortController;

			fetch(newValue, { signal: this.#manifestFetchAbortController.signal })
				.then((response) => response.json())
				.then((json) => {
					this.manifest = json;
				})
				.catch((error) => {
					if (error.name !== "AbortError")
						throw error; // surface `fetch` errors for developers
				});
			return;

		case "show-qr":
			if (convertBooleanAttribute(oldValue) !== convertBooleanAttribute(newValue))
				this.#update();
			return;
		}
	}

	#update() {
		this.#root.textContent = ""; // remove all children

		if (!this.#root.adoptedStyleSheets)
			this.#root.appendChild(VerifiableCredential.#style.cloneNode(true));

		if (!this.#data || typeof this.#data !== "object")
			return;

		if (!this.#manifest || typeof this.#manifest !== "object")
			return;

		// <https://identity.foundation/credential-manifest/#versioning>
		if (this.#manifest["spec_version"] !== VERSION)
			return;

		// Copy only the raw text of the `<* slot="description-label">` to ensure that no outside CSS leaks in.
		let descriptionLabelElements = [ ];
		function updateDescriptionLabels() {
			let descriptionLabel = descriptionLabelSlotElement.assignedNodes().map((slottedNode) => slottedNode.textContent).join("") || "Description";
			for (let descriptionLabelElement of descriptionLabelElements)
				descriptionLabelElement.textContent = descriptionLabel;
		}
		let descriptionLabelSlotMutationObserver = new MutationObserver((records) => {
			updateDescriptionLabels();
		});
		let descriptionLabelSlotElement = this.#root.appendChild(document.createElement("slot"));
		descriptionLabelSlotElement.name = "description-label";
		descriptionLabelSlotElement.addEventListener("slotchange", (event) => {
			updateDescriptionLabels();

			descriptionLabelSlotMutationObserver.disconnect();
			for (let slottedNode of descriptionLabelSlotElement.assignedNodes()) {
				descriptionLabelSlotMutationObserver.observe(slottedNode, {
					subtree: true,
					childList: true,
					characterData: true,
				});
			}
		});

		// <https://identity.foundation/credential-manifest/#general-composition>

		let issuer = verifyType(this.#manifest["issuer"], "object");
		if (issuer) {
			let issuerElement = this.#root.appendChild(document.createElement("section"));
			issuerElement.classList.add("issuer");

			this.#applyEntityStyles(issuer["styles"], issuerElement);

			let name = verifyType(issuer["name"], "string");
			if (name) {
				let nameElement = issuerElement.appendChild(document.createElement("h1"));
				nameElement.classList.add("name");
				nameElement.textContent = name;
			}
		}

		// <https://identity.foundation/credential-manifest/#output-descriptor>
		let descriptors = verifyType(this.#manifest["output_descriptors"], Array.isArray) ?? [ ];
		for (let descriptor of descriptors) {
			if (!descriptor)
				continue;

			let descriptorElement = this.#root.appendChild(document.createElement("section"));
			descriptorElement.classList.add("descriptor");

			this.#applyEntityStyles(descriptor["styles"], descriptorElement);

			// <https://identity.foundation/wallet-rendering/#data-display>

			let title = this.#resolveDisplayMappingObject(descriptor["display"]?.["title"]);
			if (title) {
				let titleElement = descriptorElement.appendChild(document.createElement("h1"));
				titleElement.classList.add("title");
				titleElement.textContent = title;
			}

			let subtitle = this.#resolveDisplayMappingObject(descriptor["display"]?.["subtitle"]);
			if (subtitle) {
				let subtitleElement = descriptorElement.appendChild(document.createElement("h2"));
				subtitleElement.classList.add("subtitle");
				subtitleElement.textContent = subtitle;
			}

			let description = this.#resolveDisplayMappingObject(descriptor["display"]?.["description"]);
			if (description) {
				let descriptionElement = descriptorElement.appendChild(document.createElement("p"));
				descriptionElement.classList.add("description");

				let labelElement = descriptionElement.appendChild(document.createElement("span"));
				labelElement.classList.add("label");
				descriptionLabelElements.push(labelElement);

				descriptionElement.append(" ", description);
			}

			let propertiesElement = descriptorElement.appendChild(document.createElement("ul"));
			propertiesElement.classList.add("properties");

			let properties = verifyType(descriptor["display"]?.["properties"], Array.isArray) ?? [ ];
			for (let property of properties) {
				if (!property)
					continue;

				let value = this.#resolveDisplayMappingObject(property);
				if (!value)
					continue;

				let propertyElement = propertiesElement.appendChild(document.createElement("li"));
				propertyElement.classList.add("property");

				// <https://identity.foundation/wallet-rendering/#labeled-display-mapping-object>
				let label = verifyType(property["label"], "string");
				if (label) {
					let labelElement = propertyElement.appendChild(document.createElement("span"));
					labelElement.classList.add("label");
					labelElement.textContent = label;

					propertyElement.append(" ");
				}

				let valueElement = propertyElement.appendChild(document.createElement("span"));
				valueElement.classList.add("value");
				valueElement.textContent = value;
			}
		}

		if (this.hasAttribute("show-qr")) {
			let qrElement = this.#root.lastElementChild.appendChild(document.createElement("img"));
			qrElement.classList.add("qr");
			qrElement.hidden = true;
			qrElement.addEventListener("load", (event) => {
				qrElement.hidden = false;
			});
			qrElement.addEventListener("error", (event) => {
				qrElement.remove();
			});
			QRCode.toDataURL(JSON.stringify(this.#data), (error, url) => {
				if (error) {
					qrElement.remove();
					return;
				}

				qrElement.src = url;
			});
		}

		updateDescriptionLabels();
	}

	// <https://identity.foundation/wallet-rendering/#entity-styles>
	#applyEntityStyles(data, containerElement) {
		if (!data)
			return;

		function handleThumbnailLoad(event) {
			event.target.hidden = false;
		}

		function handleHeroLoad(event) {
			let width = event.target.naturalWidth;
			let height = event.target.naturalHeight;

			event.target.hidden = false;

			containerElement.style.setProperty("max-width", `min(100%, ${width}px)`);
			containerElement.style.setProperty("max-height", `min(100%, ${height}px)`);
			containerElement.style.setProperty("aspect-ratio", `${width} / ${height}`);
		}

		function handleImageError(event) {
			event.target.remove();
		}

		let textColor = verifyType(data["text"]?.["color"], isHexColor);
		if (textColor)
			containerElement.style.setProperty("color", textColor);

		let backgroundColor = verifyType(data["background"]?.["color"], isHexColor);
		if (backgroundColor)
			containerElement.style.setProperty("background-color", backgroundColor);

		let thumbnailURI = verifyType(data["thumbnail"]?.["uri"], "string");
		if (isURL(thumbnailURI)) {
			let thumbnailElement = containerElement.appendChild(document.createElement("img"));
			thumbnailElement.classList.add("thumbnail");
			thumbnailElement.src = thumbnailURI;
			thumbnailElement.hidden = true;
			thumbnailElement.addEventListener("load", handleThumbnailLoad);
			thumbnailElement.addEventListener("error", handleImageError);

			let thumbnailAlt = verifyType(data["thumbnail"]?.["alt"], "string");
			if (thumbnailAlt)
				thumbnailElement.alt = thumbnailAlt;
		}

		let heroURI = verifyType(data["hero"]?.["uri"], "string");
		if (isURL(heroURI)) {
			let heroElement = containerElement.appendChild(document.createElement("img"));
			heroElement.classList.add("hero");
			heroElement.src = heroURI;
			heroElement.hidden = true;
			heroElement.addEventListener("load", handleHeroLoad);
			heroElement.addEventListener("error", handleImageError);

			let heroAlt = verifyType(data["hero"]?.["alt"], "string");
			if (heroAlt)
				heroElement.alt = heroAlt;
		}
	}

	// <https://identity.foundation/wallet-rendering/#display-mapping-object>
	#resolveDisplayMappingObject(descriptor) {
		// <https://identity.foundation/wallet-rendering/#using-text>
		if ("text" in descriptor)
			return verifyType(descriptor["text"], "string");

		// <https://identity.foundation/wallet-rendering/#using-path>
		if ("path" in descriptor) {
			let fallback = verifyType(descriptor["fallback"], "string");

			let path = verifyType(descriptor["path"], Array.isArray);
			if (path === undefined)
				return fallback;

			let value = this.#getFirstValueMatchingPaths(path);
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

	#getFirstValueMatchingPaths(paths) {
		for (let path of paths) {
			let values = JSONPath.query(this.#data, path, 1);
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
}
customElements.define("verifiable-credential", VerifiableCredential);
