import { OrielContext } from "./context";

export type NavbarVariant =
  | "default"
  | "hero-dark"
  | "hero-bright"
  | "immersive";

type NavbarContext = {
  context: OrielContext;
};

export function getNavbarVariant(
  context: NavbarContext
): NavbarVariant {
  switch (context.context) {
    case "movie":
      return "hero-dark";

    case "stream":
      return "immersive";

    case "collection":
      return "default";

    case "browse":
      return "default";

    default:
      return "default";
  }
}
