import mock from "xhr-mock";
import { IStores, createStores } from "../models/stores";
import { Logger, LogEventName } from "./logger";
import { ToolTileModel, ToolTileModelType } from "../models/tools/tool-tile";
import { defaultTextContent } from "../models/tools/text/text-content";
import { SectionDocument, DocumentModel } from "../models/document";
import { createSingleTileContent } from "../utilities/test-utils";
import { DocumentContentModel } from "../models/document-content";
import { getSnapshot } from "mobx-state-tree";

describe("logger", () => {
  let stores: IStores;

  beforeEach(() => {
    mock.setup();
    stores = createStores({
      appMode: "test"
    });

    Logger.initializeLogger(stores);
  });

  afterEach(() => {
    mock.teardown();
  });

  it("can log a simple message with all the appropriate properties", async (done) => {
    mock.post(/.*/, (req, res) => {
      expect(req.header("Content-Type")).toEqual("application/json; charset=UTF-8");

      const request = JSON.parse(req.body());

      expect(request.application).toBe("CLUE");
      expect(request.username).toBe("0");
      expect(request.session).toEqual(expect.anything());
      expect(request.time).toEqual(expect.anything());
      expect(request.event).toBe("CREATE_TILE");
      expect(request.method).toBe("do");
      expect(request.parameters).toEqual({foo: "bar"});

      done();
      return res.status(201);
    });

    await Logger.log(LogEventName.CREATE_TILE, {foo: "bar"});
  });

  it("can log tile creation", async (done) => {
    const tile = ToolTileModel.create({content: defaultTextContent()});

    mock.post(/.*/, (req, res) => {
      const request = JSON.parse(req.body());

      expect(request.event).toBe("CREATE_TILE");
      expect(request.parameters.objectId).toBe(tile.id);
      expect(request.parameters.objectType).toBe("Text");
      expect(request.parameters.serializedObject).toEqual({
        type: "Text",
        text: ""
      });
      expect(request.parameters.documentKey).toBe("");

      done();
      return res.status(201);
    });

    await Logger.logTileEvent(LogEventName.CREATE_TILE, tile);
  });

  it("can log tile creation in a document", async (done) => {
    const document = DocumentModel.create({
      type: SectionDocument,
      uid: "1",
      key: "source-document",
      createdAt: 1,
      content: {},
      visibility: "public"
    });
    stores.documents.add(document);

    mock.post(/.*/, (req, res) => {
      const request = JSON.parse(req.body());

      expect(request.event).toBe("CREATE_TILE");
      // expect(request.parameters.objectId).toBe(tile.id);
      expect(request.parameters.objectType).toBe("Text");
      expect(request.parameters.serializedObject).toEqual({
        type: "Text",
        text: "test"
      });
      expect(request.parameters.documentKey).toBe("source-document");
      expect(request.parameters.documentType).toBe("section");

      done();
      return res.status(201);
    });

    await document.content.addTextTile("test");
  });

  it("can log copying tiles between documents", async (done) => {
    const sourceDocument = DocumentModel.create({
      type: SectionDocument,
      uid: "1",
      key: "source-document",
      createdAt: 1,
      content: {},
      visibility: "public"
    });
    const content = createSingleTileContent({ type: "Text", text: "test" });
    sourceDocument.setContent(DocumentContentModel.create(content));

    const destinationDocument = DocumentModel.create({
      type: SectionDocument,
      uid: "2",
      key: "destination-document",
      createdAt: 1,
      content: {},
      visibility: "public"
    });

    stores.documents.add(sourceDocument);
    stores.documents.add(destinationDocument);

    let tileToCopy: ToolTileModelType;

    mock.post(/.*/, (req, res) => {
      const request = JSON.parse(req.body());

      expect(request.event).toBe("COPY_TILE");
      // expect(request.parameters.objectId).toBe(tile.id);
      expect(request.parameters.objectType).toBe("Text");
      expect(request.parameters.serializedObject).toEqual({
        type: "Text",
        text: "test"
      });
      expect(request.parameters.documentKey).toBe("destination-document");
      expect(request.parameters.documentType).toBe("section");
      expect(request.parameters.objectId).not.toBe(tileToCopy.id);
      expect(request.parameters.sourceDocumentKey).toBe("source-document");
      expect(request.parameters.sourceDocumentType).toBe("section");
      expect(request.parameters.souceObjectId).toBe(tileToCopy.id);

      done();
      return res.status(201);
    });

    // annoying way to get a tile...
    const firstRow = sourceDocument.content.rowMap.get(sourceDocument.content.rowOrder[0]);
    const tileIdToCopy = firstRow!.tiles[0].tileId;
    tileToCopy = sourceDocument.content.tileMap.get(tileIdToCopy) as ToolTileModelType;

    const serialized = JSON.stringify(getSnapshot(tileToCopy));

    await destinationDocument.content.copyTileIntoRow(serialized, tileToCopy.id, 0);
  });
});
