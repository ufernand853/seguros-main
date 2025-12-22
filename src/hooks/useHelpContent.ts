import { useLocation } from "react-router-dom";
import { resolveHelpContent, type HelpContent } from "../content/helpContent";

export const useHelpContent = (): HelpContent => {
  const location = useLocation();
  return resolveHelpContent(location.pathname);
};
