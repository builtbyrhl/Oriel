export type ProviderName =
  | "vidapi"
  | "provider2"
  | "provider3"
  | "provider4";

export const StreamingConfig = {
  mode: "auto" as const,

  preferred: [
    "vidapi",
    "provider2",
    "provider3",
    "provider4",
  ] satisfies ProviderName[],
};
