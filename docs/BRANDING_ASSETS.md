# Approved PBGC-themed logo pair

The theme pair was **explicitly selected by the user** after inspecting both original files.

| App theme | Selected original | Placement | Site background |
| --- | --- | --- | --- |
| Dark | `logo-negro.png` | Black-background dark-gray PBGC monogram, unchanged | `#000000` |
| Light | `logo.svg` | Full-color blue/red PBGC monogram, unchanged | `#FFFFFF` |

## Source
Both are from the connected Google Drive `pbgc-the-book-of-job` library:

- Dark: `PBGC_CASEWORK_CURATED/07_SOFTWARE_AND_ASSETS/03_Branding_Assets/Other/logo-negro.png`.
- Light: `PBGC_CASEWORK_CURATED/07_SOFTWARE_AND_ASSETS/03_Branding_Assets/images/logo.svg`.

The original source bytes are committed in `src/assets/` and bundled into the portable HTML. They are not recolored, composited, or modified. The black bitmap's corner pixels are black; the light SVG has transparent background and appears on the white site surface.

**Design note:** The chosen dark logo is intentionally low contrast. It is a user-approved aesthetic exception for the brand image, not permission to lower text or control contrast elsewhere. A 44×44 accessible sun/moon button in the top navigation toggles themes; the preference is stored in browser storage when permitted.

The repository is an independent tool and does not imply official PBGC approval. Follow the agency's branding guide and any applicable authorization rules for external distribution. The user plans to make this repository private; only the owner can change visibility through GitHub settings.
