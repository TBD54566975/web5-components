import { hideUntilLoad } from "../shared/DOM.mjs";
import { verifyType } from "../shared/Type.mjs";
import { applyEntityStyles } from "../shared/WalletRendering/EntityStyles.mjs";

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

.placeholder {
	font-style: italic;
	opacity: 0.5;
}

slot {
	display: none;
}
`;

export class CredentialManifest extends HTMLElement {
	static #style = null;

	#data = null;
	#srcFetchAbortController = null;

	#root;

	constructor() {
		super();

		this.#root = this.attachShadow({ mode: "closed" });

		if (this.#root.adoptedStyleSheets) {
			if (!CredentialManifest.#style) {
				CredentialManifest.#style = new CSSStyleSheet;
				CredentialManifest.#style.replaceSync(STYLE);
			}
			this.#root.adoptedStyleSheets = [ CredentialManifest.#style ];
		} else {
			if (!CredentialManifest.#style) {
				CredentialManifest.#style = document.createElement("style");
				CredentialManifest.#style.textContent = STYLE;
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

	static observedAttributes = [
		"src",
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
		}
	}

	#update() {
		this.#root.textContent = ""; // remove all children

		if (!this.#root.adoptedStyleSheets)
			this.#root.appendChild(CredentialManifest.#style.cloneNode(true));

		if (!this.#data || typeof this.#data !== "object")
			return;

		// <https://identity.foundation/credential-manifest/#versioning>
		if (this.#data["spec_version"] !== VERSION)
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

		let issuer = verifyType(this.#data["issuer"], "object");
		if (issuer) {
			let issuerElement = this.#root.appendChild(document.createElement("section"));
			issuerElement.classList.add("issuer");

			applyEntityStyles(issuer["styles"], issuerElement);

			let name = verifyType(issuer["name"], "string");
			if (name) {
				let nameElement = issuerElement.appendChild(document.createElement("h1"));
				nameElement.classList.add("name");
				nameElement.textContent = name;
			}
		}

		// <https://identity.foundation/credential-manifest/#output-descriptor>
		let descriptors = verifyType(this.#data["output_descriptors"], Array.isArray) ?? [ ];
		for (let descriptor of descriptors) {
			if (!descriptor)
				continue;

			let descriptorElement = this.#root.appendChild(document.createElement("section"));
			descriptorElement.classList.add("descriptor");

			applyEntityStyles(descriptor["styles"], descriptorElement);

			// <https://identity.foundation/wallet-rendering/#data-display>

			let title = this.#placeholderForDisplayMappingObject(descriptor["display"]?.["title"], "title");
			if (title) {
				let titleElement = descriptorElement.appendChild(document.createElement("h1"));
				titleElement.classList.add("title");
				titleElement.textContent = title.text;
				titleElement.classList.add(...title.classes);
			}

			let subtitle = this.#placeholderForDisplayMappingObject(descriptor["display"]?.["subtitle"], "subtitle");
			if (subtitle) {
				let subtitleElement = descriptorElement.appendChild(document.createElement("h2"));
				subtitleElement.classList.add("subtitle");
				subtitleElement.textContent = subtitle.text;
				subtitleElement.classList.add(...subtitle.classes);
			}

			let description = this.#placeholderForDisplayMappingObject(descriptor["display"]?.["description"], "description");
			if (description) {
				let descriptionElement = descriptorElement.appendChild(document.createElement("p"));
				descriptionElement.classList.add("description");

				let labelElement = descriptionElement.appendChild(document.createElement("span"));
				labelElement.classList.add("label");
				descriptionLabelElements.push(labelElement);

				descriptionElement.append(" ");

				let textElement = descriptionElement.appendChild(document.createElement("span"));
				textElement.textContent = description.text;
				textElement.classList.add(...description.classes);
			}

			let propertiesElement = descriptorElement.appendChild(document.createElement("ul"));
			propertiesElement.classList.add("properties");

			let properties = verifyType(descriptor["display"]?.["properties"], Array.isArray) ?? [ ];
			for (let property of properties) {
				if (!property)
					continue;

				let value = this.#placeholderForDisplayMappingObject(property, "property");
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
				valueElement.textContent = value.text;
				valueElement.classList.add(...value.classes);
			}
		}

		updateDescriptionLabels();
	}

	// <https://identity.foundation/wallet-rendering/#display-mapping-object>
	#placeholderForDisplayMappingObject(displayMappingObject, name) {
		if (!displayMappingObject)
			return undefined;

		// <https://identity.foundation/wallet-rendering/#using-path>
		if ("path" in displayMappingObject) {
			let fallback = verifyType(displayMappingObject["fallback"], "string");
			if (fallback)
				return { text: fallback, classes: [ ] };
			return { text: name, classes: [ "placeholder" ] };
		}

		// <https://identity.foundation/wallet-rendering/#using-text>
		if ("text" in displayMappingObject)
			return { text: verifyType(displayMappingObject["text"], "string"), classes: [ ] };

		return undefined;
	}
}
customElements.define("credential-manifest", CredentialManifest);
