import { types, Instance, SnapshotIn } from "mobx-state-tree";
import { DocumentContentModel, DocumentContentModelType } from "./document-content";
import { TileCommentsModel, TileCommentsModelType } from "../tools/tile-comments";
import { UserStarModel, UserStarModelType } from "../tools/user-star";

export const DocumentDragKey = "org.concord.clue.document.key";

export const SectionDocumentDEPRECATED = "section";
export const ProblemDocument = "problem";
export const PersonalDocument = "personal";
export const LearningLogDocument = "learningLog";
export const PublicationDocument = "publication";
export const PersonalPublication = "personalPublication";
export const LearningLogPublication = "learningLogPublication";

export function isProblemType(type: string) {
  return [ProblemDocument, PublicationDocument].indexOf(type) >= 0;
}
export function isPersonalType(type: string) {
  return [PersonalDocument, PersonalPublication].indexOf(type) >= 0;
}
export function isLearningLogType(type: string) {
  return [LearningLogDocument, LearningLogPublication].indexOf(type) >= 0;
}
export function isUnpublishedType(type: string) {
  return [SectionDocumentDEPRECATED, ProblemDocument, PersonalDocument, LearningLogDocument]
          .indexOf(type) >= 0;
}
export function isPublishedType(type: string) {
  return [PublicationDocument, PersonalPublication, LearningLogPublication].indexOf(type) >= 0;
}

export const DocumentTypeEnum = types.enumeration("type",
              [SectionDocumentDEPRECATED,
                ProblemDocument, PersonalDocument, LearningLogDocument,
                PublicationDocument, PersonalPublication, LearningLogPublication]);
export type DocumentType = typeof DocumentTypeEnum.Type;
export type OtherDocumentType = typeof PersonalDocument | typeof LearningLogDocument;
export type OtherPublicationType = typeof PersonalPublication | typeof LearningLogPublication;

export const DocumentToolEnum = types.enumeration("tool",
                                  ["delete", "drawing", "geometry", "image", "select", "table", "text"]);
export type DocumentTool = typeof DocumentToolEnum.Type;

export const DocumentModel = types
  .model("Document", {
    uid: types.string,
    type: DocumentTypeEnum,
    title: types.maybe(types.string),
    key: types.string,
    createdAt: types.number,
    content: DocumentContentModel,
    comments: types.map(TileCommentsModel),
    stars: types.array(UserStarModel),
    groupId: types.maybe(types.string),
    visibility: types.maybe(types.enumeration("VisibilityType", ["public", "private"])),
    groupUserConnections: types.map(types.boolean),
    originDoc: types.maybe(types.string),
    changeCount: types.optional(types.number, 0)
  })
  .views(self => ({
    get isProblem() {
      return (self.type === ProblemDocument) || (self.type === PublicationDocument);
    },
    get isPersonal() {
      return (self.type === PersonalDocument || (self.type === PersonalPublication));
    },
    get isLearningLog() {
      return (self.type === LearningLogDocument) || (self.type === LearningLogPublication);
    },
    get isPublished() {
      return (self.type === PublicationDocument)
              || (self.type === LearningLogPublication)
              || (self.type === PersonalPublication);
    },
    get isStarred() {
      return !!self.stars.find(star => star.starred);
    },
    isStarredByUser(userId: string) {
      return !!self.stars.find(star => star.uid === userId && star.starred);
    },
    getUserStarAtIndex(index: number) {
      return self.stars[index];
    }
  }))
  .actions((self) => ({
    setContent(content: DocumentContentModelType) {
      self.content = content;
    },

    setTitle(title: string) {
      self.title = title;
    },

    toggleVisibility(overide?: "public" | "private") {
      self.visibility = typeof overide === "undefined"
        ? (self.visibility === "public" ? "private" : "public")
        : overide;
    },

    addTile(tool: DocumentTool, addSidecarNotes?: boolean) {
      return self.content.addTile(tool, addSidecarNotes);
    },

    deleteTile(tileId: string) {
      self.content.deleteTile(tileId);
    },

    setTileComments(tileId: string, comments: TileCommentsModelType) {
      self.comments.set(tileId, comments);
    },

    setUserStar(newStar: UserStarModelType) {
      const starIndex = self.stars.findIndex(star => star.uid === newStar.uid);
      if (starIndex >= 0) {
        self.stars[starIndex] = newStar;
      } else {
        self.stars.push(newStar);
      }
    },

    toggleUserStar(userId: string) {
      const userStar = self.stars.find(star => star.uid === userId);
      if (userStar) {
        userStar.starred = !userStar.starred;
      }
      else {
        self.stars.push(UserStarModel.create({ uid: userId }));
      }
    },

    incChangeCount() {
      self.changeCount += 1;
    }
  }));

export type DocumentModelType = Instance<typeof DocumentModel>;
export type DocumentModelSnapshotType = SnapshotIn<typeof DocumentModel>;
