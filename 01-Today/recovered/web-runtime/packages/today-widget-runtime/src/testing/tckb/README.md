# Today Page `.tckb` mock fixtures (LFS-tracked)

Drop real `.tckb` ZIP envelopes here, named by their SHA-384 base64url
hash. The Today V2 and V3 MSW handlers serve them as the response body of their
respective bundle endpoints.

## Layout

```
packages/today-widget-runtime/src/testing/tckb/
├── README.md               (this file)
├── xCpQ_8nG…hLbl.tckb      hello.tckb (com.example.hello), the
│                           historical placeholder bundle; kept around
│                           as the synthesized-fallback shape baseline
│                           and welcome / smoke targets.
└── {hash}.tckb             real feed-widget bundles copied from the relevant
                            `today-tck/widgets/*/dist` directory; one per
                            canonical Today V2 or V3 fixture entry.
```

`{hash}` must match `bundle.hash` in the JSON fixture — the same 64-char
base64url string with no `sha384-` prefix. Today V2 metadata lives in
[`../today-pages-v2.ts`](../today-pages-v2.ts); Today V3 metadata lives in the
[shared V3 fixture](../today-pages-v3.ts).

## How the handler resolves bytes

`testing/tckb/{hash}.tckb` exists → MSW handler delegates to the dev-
only Next.js route `GET /_msw-tckb/{hash}.tckb`
([`apps/web` fixture route](../../../../../apps/web/src/app/%255Fmsw-tckb/[hash]/route.ts))
which reads the LFS-resolved bytes off the filesystem and returns them
with `Content-Type: application/zip` and immutable cache headers.

`testing/tckb/{hash}.tckb` missing → handler synthesizes a minimal valid
`.tckb` envelope at runtime (manifest + a placeholder `widget.mjs` + an
`integrity.json`). The synthesized form is byte-deterministic so MSW
responses remain stable across runs. Drop a real file to override.

## LFS

`*.tckb` is configured for Git LFS in the repo root `.gitattributes`.
Cloning this repo with `git lfs install` already done resolves the
binary content; otherwise files appear as 130-byte LFS pointers and the
handler falls back to the synthesized path.

These fixtures are available only through explicit mock-mode requests. Both
Next.js apps trace them into their server output so the same deterministic mock
contract works in Preview deployments.

## Adding a fixture

1. Make sure `git lfs install` has been run locally.
2. Drop `<hash>.tckb` into this directory.
3. Update `bundle.hash`, `bundle.bytes`, and the inline manifest in the owning
   Today V2 or V3 fixture.
4. `git add packages/today-widget-runtime/src/testing/tckb/<hash>.tckb` — LFS attribute kicks in.
5. Verify with `git lfs ls-files`.

## Producing a `.tckb`

In `today-tck`, build the target template and copy the resulting `.tckb`
from its `dist/` directory:

```sh
pnpm build:widgets
```

Then compute the SHA-384 base64url of the unpacked `widget.mjs`
(the hash key for both the cloud bundle URL and our share URL):

```sh
unzip -p widget.tckb widget.mjs \
  | openssl dgst -sha384 -binary \
  | basenc --base64url \
  | tr -d '=' \
  | head -c 64
```

Rename the file to `<that-hash>.tckb` and drop it here.
