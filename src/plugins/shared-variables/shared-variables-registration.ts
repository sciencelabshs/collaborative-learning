import { registerSharedModelInfo } from "../../models/shared/shared-model-registry";
import { registerTextPluginInfo } from "../../models/tiles/text/text-plugin-info";
import { kSharedVariablesID, SharedVariables } from "./shared-variables";
import { VariablesPlugin, NewVariableTextButton, InsertVariableTextButton,
  EditVariableTextButton} from "./slate/variables-plugin";
import { registerDrawingObjectInfo, registerDrawingToolInfo } from "../drawing/components/drawing-object-manager";
import { EditVariableButton, InsertVariableButton, NewVariableButton, VariableChipComponent, VariableChipObject }
  from "./drawing/variable-object";

registerSharedModelInfo({
  type: kSharedVariablesID,
  modelClass: SharedVariables
});

registerTextPluginInfo({
  pluginName: "Variables",
  createSlatePlugin: textContent=> new VariablesPlugin(textContent),
  // FIXME: These strings are used in a few places they should be shared
  buttonDefs: {
    "new-variable": NewVariableTextButton,
    "insert-variable": InsertVariableTextButton,
    "edit-variable": EditVariableTextButton
  }
});

registerDrawingObjectInfo({
  type: "variable",
  component:VariableChipComponent,
  modelClass: VariableChipObject
});

registerDrawingToolInfo({
  name: "insert-variable",
  buttonComponent: InsertVariableButton
});

registerDrawingToolInfo({
  name: "new-variable",
  buttonComponent: NewVariableButton
});

registerDrawingToolInfo({
  name: "edit-variable",
  buttonComponent: EditVariableButton
});
