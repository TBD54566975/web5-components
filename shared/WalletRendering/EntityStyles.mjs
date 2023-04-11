import { isHexColor } from "../../shared/Color.mjs";
import { hideUntilLoad } from "../../shared/DOM.mjs";
import { verifyType } from "../../shared/Type.mjs";
import { isURL } from "../../shared/URL.mjs";

// <https://identity.foundation/wallet-rendering/#entity-styles>
export function applyEntityStyles(entityStyles, containerElement) {
	if (!entityStyles)
		return;

	let textColor = verifyType(entityStyles["text"]?.["color"], isHexColor);
	if (textColor)
		containerElement.style.setProperty("color", textColor);

	let backgroundColor = verifyType(entityStyles["background"]?.["color"], isHexColor);
	if (backgroundColor)
		containerElement.style.setProperty("background-color", backgroundColor);

	let thumbnailURI = verifyType(entityStyles["thumbnail"]?.["uri"], "string");
	if (isURL(thumbnailURI)) {
		let thumbnailElement = containerElement.appendChild(document.createElement("img"));
		thumbnailElement.classList.add("thumbnail");
		thumbnailElement.src = thumbnailURI;
		hideUntilLoad(thumbnailElement);

		let thumbnailAlt = verifyType(entityStyles["thumbnail"]?.["alt"], "string");
		if (thumbnailAlt)
			thumbnailElement.alt = thumbnailAlt;
	}

	let heroURI = verifyType(entityStyles["hero"]?.["uri"], "string");
	if (isURL(heroURI)) {
		let heroElement = containerElement.appendChild(document.createElement("img"));
		heroElement.classList.add("hero");
		heroElement.src = heroURI;
		hideUntilLoad(heroElement, () => {
			containerElement.style.setProperty("max-width", `min(100%, ${heroElement.naturalWidth}px)`);
			containerElement.style.setProperty("max-height", `min(100%, ${heroElement.naturalHeight}px)`);
			containerElement.style.setProperty("aspect-ratio", `${heroElement.naturalWidth} / ${heroElement.naturalHeight}`);
		});

		let heroAlt = verifyType(entityStyles["hero"]?.["alt"], "string");
		if (heroAlt)
			heroElement.alt = heroAlt;
	}
}
