import { SnapshotIn, types } from "mobx-state-tree";
import { debounce } from "lodash";
import { AppConfigModelType } from "./app-config-model";
import { kDividerHalf, kDividerMax, kDividerMin, UIDialogTypeEnum } from "./ui-types";
import { WorkspaceModel } from "./workspace";
import { DocumentModelType } from "../document/document";
import { Logger } from "../../lib/logger";
import { LogEventName } from "../../lib/logger-types";
import { ITileModel } from "../tiles/tile-model";
import { ENavTab } from "../view/nav-tabs";

type BooleanDialogResolver = (value: boolean | PromiseLike<boolean>) => void;
type StringDialogResolver = (value: string | PromiseLike<string>) => void;
let dialogResolver: BooleanDialogResolver | StringDialogResolver | undefined;

// Information needed to scroll to a tile (for example, when a comment about a tile is selected)
const ScrollToModel = types
  .model("ScrollTo", {
    tileId: types.string,
    docId: types.string // key for user doc, path for problem doc
  });

export const UIDialogModel = types
  .model("UIDialog", {
    type: UIDialogTypeEnum,
    text: types.string,
    title: types.maybe(types.string),
    className: "",
    defaultValue: types.maybe(types.string),
    rows: types.maybe(types.number)
  });
type UIDialogModelSnapshot = SnapshotIn<typeof UIDialogModel>;
type UIDialogModelSnapshotWithoutType = Omit<UIDialogModelSnapshot, "type">;

export const UIModel = types
  .model("UI", {
    dividerPosition: kDividerHalf,
    error: types.maybeNull(types.string),
    activeNavTab: ENavTab.kProblems,
    activeGroupId: "",
    selectedTileIds: types.array(types.string),
    selectedCommentId: types.maybe(types.string),
    scrollTo: types.maybe(ScrollToModel),
    showDemo: false,
    showDemoCreator: false,
    showTeacherContent: true,
    showChatPanel: false,
    dialog: types.maybe(UIDialogModel),
    // document key or section path for reference (left) document
    focusDocument: types.maybe(types.string),
    // counter that serves to trigger updates
    focusDocUpdates: 0,
    problemWorkspace: WorkspaceModel,
    learningLogWorkspace: WorkspaceModel,
    teacherPanelKey: types.maybe(types.string),
    selectedCommentedDocument: types.maybe(types.string),//key of selected commented MyWork/ClassWork doc
    dragId: types.maybe(types.string) // The id of the object being dragged. Used with dnd-kit dragging.
  })
  .volatile(self => ({
    defaultLeftNavExpanded: false,
  }))
  .views((self) => ({
    isSelectedTile(tile: ITileModel) {
      return self.selectedTileIds.indexOf(tile.id) !== -1;
    },
    get navTabContentShown () {
      return self.dividerPosition > kDividerMin;
    },
    get workspaceShown () {
      return self.dividerPosition < kDividerMax;
    },
  }))
  .actions((self) => {
    const alert = (textOrOpts: string | UIDialogModelSnapshotWithoutType, title?: string) => {
      self.dialog = UIDialogModel.create(typeof textOrOpts === "string"
                                          ? { type: "alert", text: textOrOpts, title }
                                          : { type: "alert", ...textOrOpts });
      dialogResolver = undefined;
    };

    const confirm = (textOrOpts: string | UIDialogModelSnapshotWithoutType, title?: string) => {
      self.dialog = UIDialogModel.create(typeof textOrOpts === "string"
                                          ? { type: "confirm", text: textOrOpts, title }
                                          : { type: "confirm", ...textOrOpts });
      return new Promise<boolean>((resolve, reject) => {
        dialogResolver = resolve;
      });
    };

    const prompt = (textOrOpts: string | UIDialogModelSnapshotWithoutType,
                    defaultValue = "", title?: string, rows?: number) => {
      self.dialog = UIDialogModel.create(typeof textOrOpts === "string"
                                          ? { type: "prompt", text: textOrOpts, defaultValue, title, rows }
                                          : { type: "prompt", ...textOrOpts });
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

      setDividerPosition(position: number) {
        self.dividerPosition = position;
      },
      toggleShowTeacherContent(show: boolean) {
        self.showTeacherContent = show;
      },
      toggleShowChatPanel(show:boolean) {
        self.showChatPanel = show;
      },
      setError(error: string) {
        self.error = error ? error.toString() : error;
        Logger.log(LogEventName.INTERNAL_ERROR_ENCOUNTERED, { message: self.error });
        console.error(self.error);
      },
      clearError() {
        self.error = null;
      },
      setActiveNavTab(tab: string) {
        self.activeNavTab = tab;
      },
      setActiveStudentGroup(groupId: string) {
        self.activeNavTab = ENavTab.kStudentWork;
        self.activeGroupId = groupId;
      },
      setSelectedTile(tile?: ITileModel, options?: {append: boolean}) {
        setOrAppendTileIdToSelection(tile && tile.id, options);
      },
      setSelectedTileId(tileId: string, options?: {append: boolean}) {
        setOrAppendTileIdToSelection(tileId, options);
      },
      removeTileIdFromSelection(tileId: string) {
        self.selectedTileIds.remove(tileId);
      },
      setScrollTo(tileId: string, docId: string) {
        self.scrollTo = ScrollToModel.create({ tileId, docId });
      },
      setShowDemoCreator(showDemoCreator: boolean) {
        self.showDemoCreator = showDemoCreator;
      },
      closeDialog,
      setFocusDocument(documentKey?: string) {
        self.focusDocument = documentKey;
      },
      updateFocusDocument() {
        // increment counter to trigger observers to update
        ++self.focusDocUpdates;
      },
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
      },
      setSelectedCommentedDocument(key: string | undefined){
        self.selectedCommentedDocument = key ;
      },
      setDraggingId(dragId?: string) {
        self.dragId = dragId;
      }
    };
  })
  .actions(self => ({
    clearSelectedTiles() {
      self.selectedTileIds.forEach(tileId => self.removeTileIdFromSelection(tileId));
    }
  }));

export type UIModelType = typeof UIModel.Type;
export type UIDialogModelType = typeof UIDialogModel.Type;

export function selectTile(ui: UIModelType, model: ITileModel, isExtending?: boolean) {
  ui.setSelectedTile(model, { append: !!isExtending });
}

// Sometimes we get multiple selection events for a single click.
// We only want to respond once per such burst of selection events.
export const debouncedSelectTile = debounce(selectTile, 50);
