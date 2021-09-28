import { ProblemModel } from "../models/curriculum/problem";
import { AppConfigModel } from "../models/stores/app-config-model";
import { ClassModel } from "../models/stores/class";
import { DemoClassModel, DemoModel } from "../models/stores/demo";
import { DocumentsModel } from "../models/stores/documents";
import { GroupsModel } from "../models/stores/groups";
import { SelectionStoreModel } from "../models/stores/selection";
import { UIModel } from "../models/stores/ui";
import { UserModel } from "../models/stores/user";
import { LearningLogWorkspace, ProblemWorkspace, WorkspaceModel } from "../models/stores/workspace";
import {
  useAppConfigStore, useAppMode, useClassStore, useDemoStore, useGroupsStore, useNetworkDocumentKey, useProblemPath,
  useProblemPathWithFacet, useProblemStore, useSharedSelectionStore, useTypeOfTileInDocumentOrCurriculum,
  useUIStore, useUserStore
} from "./use-stores";

jest.mock("@concord-consortium/slate-editor", () => ({}));

var mockUseContext = jest.fn();
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useContext: () => mockUseContext()
}));

describe("useStores", () => {
  function resetMocks() {
    mockUseContext.mockReset();
  }

  describe("simple store hooks", () => {
    beforeEach(() => resetMocks());
    it("should return the requested store", () => {
      const appConfig = AppConfigModel.create();
      const _class = ClassModel.create({ name: "Class 1", classHash: "hash-1" });
      const demo = DemoModel.create({ class : DemoClassModel.create({ id: "class-1", name: "Class 1" }) });
      const groups = GroupsModel.create();
      const problemPath = "sas/1/2";
      const problemPathWithFacet = "sas:facet/1/2";
      const problem = ProblemModel.create({ ordinal: 2, title: "1.2" });
      const selection = SelectionStoreModel.create();
      const ui = UIModel.create({
        problemWorkspace: WorkspaceModel.create({ type: ProblemWorkspace, mode: "4-up" }),
        learningLogWorkspace: WorkspaceModel.create({ type: LearningLogWorkspace, mode: "1-up" })
      });
      const user = UserModel.create({ id: "id-1", network: "network-1" });
      mockUseContext.mockImplementation(() => ({
        stores: {
          appConfig,
          appMode : "authed",
          class: _class,
          demo,
          groups,
          problemPath,
          problem,
          selection,
          ui,
          user
        }
      }));
      expect(useAppConfigStore()).toBe(appConfig);
      expect(useAppMode()).toBe("authed");
      expect(useClassStore()).toBe(_class);
      expect(useDemoStore()).toBe(demo);
      expect(useGroupsStore()).toBe(groups);
      expect(useNetworkDocumentKey("document-key")).toBe("network-1_document-key");
      expect(useProblemPath()).toBe(problemPath);
      expect(useProblemPathWithFacet("facet")).toBe(problemPathWithFacet);
      expect(useProblemStore()).toBe(problem);
      expect(useSharedSelectionStore()).toBe(selection);
      expect(useUIStore()).toBe(ui);
      expect(useUserStore()).toBe(user);
    });
  });

  describe("useTypeOfTileInDocumentOrCurriculum", () => {
    beforeEach(() => resetMocks());

    it("should return undefined if specified document or tile doesn't exist", () => {
      mockUseContext.mockImplementation(() => ({
        stores: {
          documents : DocumentsModel.create()
        }
      }));
      expect(useTypeOfTileInDocumentOrCurriculum()).toBeUndefined();
      expect(useTypeOfTileInDocumentOrCurriculum("key")).toBeUndefined();
      expect(useTypeOfTileInDocumentOrCurriculum(undefined, "id")).toBeUndefined();
      expect(useTypeOfTileInDocumentOrCurriculum("key", "id")).toBeUndefined();
    });

    it("should return type of tile from tile id for curriculum documents", () => {
      mockUseContext.mockImplementation(() => ({
        stores: {
          documents : {
            getTypeOfTileInDocument: () => "Text"
          }
        }
      }));
      expect(useTypeOfTileInDocumentOrCurriculum("sas/1/2/introduction", "foo")).toBeUndefined();
      expect(useTypeOfTileInDocumentOrCurriculum("sas/1/2/introduction", "introduction_Text_1")).toBe("Text");
      expect(useTypeOfTileInDocumentOrCurriculum("sas/1/2/introduction", "introduction_Geometry_1")).toBe("Geometry");
    });

    it("should return type of tile from content for user documents", () => {
      mockUseContext.mockImplementation(() => ({
        stores: {
          documents : {
            getTypeOfTileInDocument: () => "Text"
          }
        }
      }));
      expect(useTypeOfTileInDocumentOrCurriculum("document-key", "tile-id")).toBe("Text");
    });
  });

});
