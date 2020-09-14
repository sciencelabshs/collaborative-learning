import { types } from "mobx-state-tree";
import { debounce } from "lodash";
import { AppConfigModelType } from "./app-config-model";
import { WorkspaceModel } from "./workspace";
import { DocumentModelType } from "../document/document";
import { ToolTileModelType } from "../tools/tool-tile";
import { ENavTab } from "../view/nav-tabs";
import { isSelectionModifierKeyDown } from "../../utilities/event-utils";

export type ToggleElement = "leftNavExpanded";

export const UIDialogTypeEnum = types.enumeration("dialogType", ["alert", "confirm", "prompt"]);
export type UIDialogType = typeof UIDialogTypeEnum.Type;

type BooleanDialogResolver = (value?: boolean | PromiseLike<boolean> | undefined) => void;
type StringDialogResolver = (value?: string | PromiseLike<string> | undefined) => void;
let dialogResolver: BooleanDialogResolver | StringDialogResolver | undefined;

export const UIDialogModel = types
  .model("UIDialog", {
    type: UIDialogTypeEnum,
    text: types.string,
    title: types.maybe(types.string),
    defaultValue: types.maybe(types.string),
    rows: types.maybe(types.number)
  });

export const UIModel = types
  .model("UI", {
    navTabContentShown: false,
    error: types.maybeNull(types.string),
    activeNavTab: ENavTab.kMyWork,
    activeGroupId: "",
    selectedTileIds: types.array(types.string),
    showDemo: false,
    showDemoCreator: false,
    dialog: types.maybe(UIDialogModel),
    problemWorkspace: WorkspaceModel,
    learningLogWorkspace: WorkspaceModel,
    teacherPanelKey: types.maybe(types.string)
  })
  .volatile(self => ({
    defaultLeftNavExpanded: false,
  }))
  .views((self) => ({
    isSelectedTile(tile: ToolTileModelType) {
      return self.selectedTileIds.indexOf(tile.id) !== -1;
    }
  }))
  .actions((self) => {
    const alert = (text: string, title?: string) => {
      self.dialog = UIDialogModel.create({type: "alert", text, title});
      dialogResolver = undefined;
    };

    const confirm = (text: string, title?: string) => {
      self.dialog = UIDialogModel.create({type: "confirm", text, title});
      return new Promise<boolean>((resolve, reject) => {
        dialogResolver = resolve;
      });
    };

    const prompt = (text: string, defaultValue = "", title?: string, rows?: number) => {
      self.dialog = UIDialogModel.create({type: "prompt", text, defaultValue, title, rows});
      return new Promise<string>((resolve, reject) => {
        dialogResolver = resolve;
      });
    };

    const resolveDialog = (value: string | boolean) => {
      if (dialogResolver) {
        dialogResolver(value as any);
      }
      closeDialog();
    };

    const closeDialog = () => {
      self.dialog = undefined;
      dialogResolver = undefined;
    };

    const setOrAppendTileIdToSelection = (tileId?: string, options?: {append: boolean}) => {
      if (tileId) {
        const tileIdIndex = self.selectedTileIds.indexOf(tileId);
        const isCurrentlySelected = tileIdIndex >= 0;
        const isExtendingSelection = options?.append;
        if (isExtendingSelection) {
          if (isCurrentlySelected) {
            // clicking on a selected tile with a modifier key deselects it
            self.selectedTileIds.splice(tileIdIndex, 1);
          }
          else {
            self.selectedTileIds.push(tileId);
          }
        } else if (!isCurrentlySelected) {
          self.selectedTileIds.replace([tileId]);
        }
        // clicking on an already-selected tile doesn't change selection
      } else {
        self.selectedTileIds.clear();
      }
    };

    return {
      alert,
      prompt,
      confirm,
      resolveDialog,

      toggleNavTabContent(show: boolean) {
        self.navTabContentShown = show;
      },
      setError(error: string|null) {
        self.error = error ? error.toString() : error;
      },
      setActiveNavTab(tab: string) {
        self.activeNavTab = tab;
      },
      setActiveStudentGroup(groupId: string) {
        self.activeNavTab = ENavTab.kStudentWork;
        self.activeGroupId = groupId;
      },
      setSelectedTile(tile?: ToolTileModelType, options?: {append: boolean}) {
        setOrAppendTileIdToSelection(tile && tile.id, options);
      },
      setSelectedTileId(tileId: string, options?: {append: boolean}) {
        setOrAppendTileIdToSelection(tileId, options);
      },
      removeTileIdFromSelection(tileId: string) {
        self.selectedTileIds.remove(tileId);
      },
      setShowDemoCreator(showDemoCreator: boolean) {
        self.showDemoCreator = showDemoCreator;
      },
      closeDialog,

      rightNavDocumentSelected(appConfig: AppConfigModelType, document: DocumentModelType) {
        if (!document.isPublished || appConfig.showPublishedDocsInPrimaryWorkspace) {
          self.problemWorkspace.setAvailableDocument(document);
        }
        else if (document.isPublished) {
          if (self.problemWorkspace.primaryDocumentKey) {
            self.problemWorkspace.setComparisonDocument(document);
            self.problemWorkspace.toggleComparisonVisible({override: true});
          }
          else {
            alert("Please select a primary document first.", "Select Primary Document");
          }
        }
      },
      setTeacherPanelKey(key: string) {
        self.teacherPanelKey = key;
      }
    };
  });

export type UIModelType = typeof UIModel.Type;
export type UIDialogModelType = typeof UIDialogModel.Type;

export function selectTile(ui: UIModelType, model: ToolTileModelType, isExtending?: boolean) {
  const append = isExtending ?? isSelectionModifierKeyDown();
  ui.setSelectedTile(model, { append });
}

// Sometimes we get multiple selection events for a single click.
// We only want to respond once per such burst of selection events.
export const debouncedSelectTile = debounce(selectTile, 50);
