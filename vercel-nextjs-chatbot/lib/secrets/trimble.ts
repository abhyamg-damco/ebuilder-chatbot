/** Canonical vault slugs written by the Trimble setup form. */
export const TRIMBLE_SECRET_SLUGS = {
  url: "trimble-site-url",
  username: "trimble-username",
  password: "trimble-password",
} as const;

export const TRIMBLE_SECRET_SLUG_LIST = Object.values(TRIMBLE_SECRET_SLUGS);

/** Default e-Builder site credentials prefilled on the Trimble setup form. */
export const TRIMBLE_DEFAULT_CREDENTIALS = {
  websiteUrl: "https://app-us2.e-builder.net",
  username: "powerapp@onindus.com",
  password: "Lkjd@%6099!",
} as const;
