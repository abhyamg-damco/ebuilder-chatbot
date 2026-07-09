/** Canonical vault slugs written by the Trimble setup form. */
export const TRIMBLE_SECRET_SLUGS = {
  url: "trimble-site-url",
  username: "trimble-username",
  password: "trimble-password",
} as const;

export const TRIMBLE_SECRET_SLUG_LIST = Object.values(TRIMBLE_SECRET_SLUGS);
