# Credential Manifest

A basic `<credential-manifest>` custom element that renders a [credential manifest](https://identity.foundation/credential-manifest/).

Playground: <[https://tbd54566975.github.io/web5-components/demo/CredentialManifest/](https://tbd54566975.github.io/web5-components/demo/CredentialManifest/)>

## HTML Attributes

- `src` is a URL to the [credential manifest](https://identity.foundation/credential-manifest/)

## JS Properties

- `data` is the JSON payload of the [credential manifest](https://identity.foundation/credential-manifest/)

## Layout

The `<credential-manifest>` will contain a section for the `"issuer"` and each item in `"output_descriptors"`.

The size of each section will be the minimum of the space made available for it by the parent and the size of the `"hero"` (if provided).  Each section will also match the aspect ratio of the `"hero"` (if provided).

The `"thumbnail"` of the [credential manifest](https://identity.foundation/credential-manifest/) is rendered in the top left corner of the section (if provided).

The `"title"`, `"subtitle"`, `"description"`, and `"properties"` are rendered in the bottom left corner of the section (if provided).

The "Description" label can be customized using a `<* slot="description-label">text goes here</*>` inside the `<credential-manifest>`.  Note that only the `textContent` will be used, not any matching/applied styles.

## Style

Any default inheritable properties (e.g. `font`, `border-radius`, etc.) will be inherited from the parent of the `<credential-manifest>` (though sequential sections will not have `border-radius` applied in between) unless overridden by a value in the [credential manifest](https://identity.foundation/credential-manifest/) (e.g. `"text"`, `"background",` etc.).
