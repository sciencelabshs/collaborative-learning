import firebase from "firebase/app";
import { DB } from "./db";
import { createDocumentsModelWithRequiredDocuments, DocumentsModel } from "../models/stores/documents";
import { IStores, createStores } from "../models/stores/stores";
import { UserModel } from "../models/stores/user";
import { DBDocument } from "./db-types";
import { DocumentModel } from "../models/document/document";
import { DocumentContentModel } from "../models/document/document-content";
import { PersonalDocument, ProblemDocument } from "../models/document/document-types";
import { TextContentModelType } from "../models/tools/text/text-content";
import { ToolTileModelType } from "../models/tools/tool-tile";
import { createSingleTileContent } from "../utilities/test-utils";
import * as UrlParams from "../utilities/url-params";

// This is needed so MST can deserialize snapshots referring to tools
import "../register-tools";

type QueryParams = UrlParams.QueryParams;

describe("db", () => {
  let stores: IStores;
  let db: DB;
  const originalUrlParams = UrlParams.urlParams;
  const setUrlParams = (params: QueryParams) => {
    (UrlParams as any).urlParams = params;
  };

  beforeEach(() => {
    setUrlParams(originalUrlParams);
    stores = createStores({
      appMode: "test",
      documents: DocumentsModel.create(),
      user: UserModel.create({id: "1", portal: "example.com"})
    });
    db = new DB();
  });

  afterEach(() => {
    // delete all test data (for this unique anonymous test user)
    db.firebase.ref().remove();
    db.disconnect();
  });

  it("connects/disconnects", async () => {
    expect.assertions(5);
    expect(db.firebase.isConnected).toBe(false);
    expect(db.isAuthStateSubscribed()).toBe(false);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    expect(db.firebase.isConnected).toBe(true);
    expect(db.isAuthStateSubscribed()).toBe(true);
    db.disconnect();
    expect(db.isAuthStateSubscribed()).toBe(false);
}, 5000);

  it("connects/disconnects when configured to use the emulators", async () => {
    setUrlParams({ firebase: "emulator", firestore: "emulator", functions: "emulator" });
    const mockUseDatabaseEmulator = jest.spyOn(firebase.database(), "useEmulator").mockImplementation(() => null);
    const mockUseFirestoreEmulator = jest.spyOn(firebase.firestore(), "useEmulator").mockImplementation(() => null);
    const mockUseFunctionsEmulator = jest.spyOn(firebase.functions(), "useEmulator").mockImplementation(() => null);
    expect.assertions(8);
    expect(db.firebase.isConnected).toBe(false);
    expect(db.isAuthStateSubscribed()).toBe(false);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    expect(mockUseDatabaseEmulator).toHaveBeenCalled();
    expect(mockUseFirestoreEmulator).toHaveBeenCalled();
    expect(mockUseFunctionsEmulator).toHaveBeenCalled();
    expect(db.firebase.isConnected).toBe(true);
    expect(db.isAuthStateSubscribed()).toBe(true);
    db.disconnect();
    expect(db.isAuthStateSubscribed()).toBe(false);
    mockUseDatabaseEmulator.mockReset();
    mockUseFirestoreEmulator.mockReset();
    mockUseFunctionsEmulator.mockReset();
}, 5000);

  it("resolves paths in test mode", async () => {
    expect.assertions(2);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    expect(db.firebase.getRootFolder()).toMatch(/^\/test\/([^/])+\/portals\/example_com\/$/);
    expect(db.firebase.getFullPath("foo")).toMatch(/^\/test\/([^/])+\/portals\/example_com\/foo$/);
  });

  it("resolves paths in dev mode", async () => {
    expect.assertions(2);
    stores.appMode = "dev";
    await db.connect({appMode: "dev", stores, dontStartListeners: true});
    expect(db.firebase.getRootFolder()).toMatch(/^\/dev\/([^/])+\/portals\/example_com\/$/);
    expect(db.firebase.getFullPath("foo")).toMatch(/^\/dev\/([^/])+\/portals\/example_com\/foo$/);
  });

  it("can get a reference to the database", async () => {
    expect.assertions(1);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    const testString = "this is a test";
    const ref = db.firebase.ref("write-test");
    ref.set(testString);
    const snapshot = await ref.once("value");
    expect(snapshot.val()).toBe(testString);
  });

  it("can parse document text content", async () => {
    expect.assertions(4);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    const storedJsonString = JSON.stringify(createSingleTileContent({ type: "Text", text: "Testing" }));
    const docContentSnapshot = db.parseDocumentContent({content: storedJsonString} as DBDocument);
    const docContent = DocumentContentModel.create(docContentSnapshot);

    if (docContent == null) {
      fail();
      return;
    }

    expect(docContent.tileMap.size).toBe(1);
    docContent.tileMap.forEach((tile: ToolTileModelType) => {
      const tileContent = tile.content as TextContentModelType;
      expect(tileContent.type).toBe("Text");
      expect(tileContent.format).toBeUndefined();
      expect(tileContent.text).toBe("Testing");
    });
  });

  it("creates required personal document from promise", async () => {
    const personalDocument = DocumentModel.create({ uid: "1", type: PersonalDocument, key: "doc-1" });
    stores.documents = createDocumentsModelWithRequiredDocuments([PersonalDocument]);
    stores.documents.resolveRequiredDocumentPromise(personalDocument);
    await db.connect({appMode: "test", stores, dontStartListeners: true});
    expect(await db.guaranteeOpenDefaultDocument(PersonalDocument)).toBe(personalDocument);
  });

  it("logs errors when asked to open default documents without required document promises", async () => {
    await db.connect({appMode: "test", stores, dontStartListeners: true});

    jestSpyConsole("error", async (mockConsole, mockRestore) => {
      await db.guaranteeOpenDefaultDocument(ProblemDocument);
      expect(mockConsole).toHaveBeenCalledTimes(1);
      await db.guaranteeOpenDefaultDocument(PersonalDocument);
      expect(mockConsole).toHaveBeenCalledTimes(2);
      await db.guaranteePlanningDocument([]);
      expect(mockConsole).toHaveBeenCalledTimes(3);
      await db.guaranteeLearningLog();
      expect(mockConsole).toHaveBeenCalledTimes(4);
      mockRestore();
    }, { asyncRestore: true });
  });

});
