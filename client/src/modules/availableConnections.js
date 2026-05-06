import { getSourcePickerItems } from "../sources";

export default getSourcePickerItems().map((source) => ({
  type: source.id,
  name: source.name,
  ai: Boolean(source.capabilities?.ai?.canGenerateQueries),
}));
