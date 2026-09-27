import { integrationCode } from "../helpers/integration-code";
import { highlightTsx } from "../helpers/syntax-highlighter";

const highlightedIntegrationCode = highlightTsx(integrationCode);

export default function HighlightedIntegrationCode() {
  return (
    <div dangerouslySetInnerHTML={{ __html: highlightedIntegrationCode }} />
  );
}
