# Verifiable Credential

A basic `<verifiable-credential>` custom element that renders a [verifiable credential](https://www.w3.org/TR/vc-data-model/) given a [credential manifest](https://identity.foundation/credential-manifest/).

## HTML Attributes

- `src` is a URL to the [verifiable credential](https://www.w3.org/TR/vc-data-model/)
- `manifest` is a URL to the [credential manifest](https://identity.foundation/credential-manifest/)

## JS Properties

- `data` is a JSON payload of the [verifiable credential](https://www.w3.org/TR/vc-data-model/)
- `manifest` is the JSON payload of the [credential manifest](https://identity.foundation/credential-manifest/)

## Layout

The size of the `<verifiable-credential>` will be the minimum of the space made available for it by the parent and the size of the `"hero"` (if provided).  `<verifiable-credential>` will also match the aspect ratio of the `"hero"` (if provided).

The `"thumbnail"` of the [credential manifest](https://identity.foundation/credential-manifest/) is rendered in the top left corner (if provided).

The `"title"`, `"subtitle"`, `"description"`, and `"properties"` are rendered in the bottom left corner (if provided).  They are each allowed only one line of text.

## Style

`<verifiable-credential>` will inherit the `font` of its parent.
