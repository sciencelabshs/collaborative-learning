import { ESupportMode, ESupportType } from "../models/curriculum/support";
import { AudienceEnum, SectionTarget } from "../models/stores/supports";

export type DatabaseType = "firebase" | "firestore";

// NOTE: see docs/firebase-schema.md to see a visual hierarchy of these interfaces

export interface DBPortalUser {
  version: "1.0";
  self: {
    uid: string
  };
  latestGroupId: string;
  documentMetadata: DBDocumentMetadataMap;
  documents: DBDocumentMap;
  lastSupportViewTimestamp?: number;
  lastStickyNoteViewTimestamp?: number;
}

export interface DBDocumentMetadataMap {
  // documentKey is same value as DBDocumentMap
  [key /* documentKey */: string]: DBDocumentMetadata;
}

export interface DBDocumentMap {
  // documentKey is generated by push to DBDocumentMap
  [key /* documentKey */: string]: DBDocument;
}

export type DBDocumentType = "section" |
                              "problem" | "planning" | "publication" |
                              "personal" | "personalPublication" |
                              "learningLog" | "learningLogPublication" |
                              "supportPublication";
export type DBDocumentMetadata = DBSectionDocumentMetadataDEPRECATED |
                                 DBProblemDocumentMetadata |
                                 DBPersonalDocumentMetadata |
                                 DBPlanningDocumentMetadata |
                                 DBLearningLogDocumentMetadata |
                                 DBPublicationDocumentMetadata |
                                 DBPersonalPublicationMetadata |
                                 DBLearningLogPublicationMetadata |
                                 DBSupportPublicationMetadata;

// metadata written to {classHash}/users/{userId}/documentMetadata for all document types
export interface DBBaseDocumentMetadata {
  version: "1.0";
  self: {
    uid: string;
    classHash: string;
    documentKey: string;
  };
  createdAt: number;
  type: DBDocumentType;
}

export interface DBBaseProblemDocumentMetadata extends DBBaseDocumentMetadata {
  classHash: string;
  offeringId: string;
}

export interface DBSectionDocumentMetadataDEPRECATED extends DBBaseProblemDocumentMetadata {
  type: "section";
}
export interface DBProblemDocumentMetadata extends DBBaseProblemDocumentMetadata {
  type: "problem";
}
export interface DBPlanningDocumentMetadata extends DBBaseProblemDocumentMetadata {
  type: "planning";
}
export interface DBPersonalDocumentMetadata extends DBBaseDocumentMetadata {
  type: "personal";
}
export interface DBLearningLogDocumentMetadata extends DBBaseDocumentMetadata {
  type: "learningLog";
}
export interface DBPublicationDocumentMetadata extends DBBaseProblemDocumentMetadata {
  type: "publication";
}

export interface DBPersonalPublicationMetadata extends DBBaseDocumentMetadata {
  type: "personalPublication";
}

export interface DBLearningLogPublicationMetadata extends DBBaseDocumentMetadata {
  type: "learningLogPublication";
}

export interface DBSupportPublicationMetadata extends DBBaseProblemDocumentMetadata {
  type: "supportPublication";
}

export interface DBGroupUserConnections {
  [key /*userId*/: string]: boolean;
}

// contents written to {classHash}/users/{userId}/documents for all document types
export interface DBDocument {
  version: "1.0";
  self: {
    uid: string;
    documentKey: string;
    classHash: string;
  };
  content?: string;
  changeCount?: number;
  type: DBDocumentType;
}

export interface IDocumentProperties {
  [key: string]: string;
}

// metadata written to {classHash}/users/{userId}/personalDocs (for personal documents)
// and {classHash}/users/{userId}/learningLogs (for learning logs)
export interface DBOtherDocument {
  version: "1.0";
  self: {
    uid: string;
    classHash: string;
    documentKey: string;
  };
  title: string;
  properties?: IDocumentProperties;
}

// metadata written to {classHash}/offerings/{offeringId}/publications
// for published section [deprecated] and problem documents
export interface DBPublication {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
  };
  documentKey: string;
  groupId?: string;
  userId: string;
  groupUserConnections?: DBGroupUserConnections;
}

// metadata written to {classHash}/offerings/{offeringId}/personalPublications for published personal documents
// and to {classHash}/offerings/{offeringId}/publications for learning logs ¯\_(ツ)_/¯
export interface DBOtherPublication {
  version: "1.0";
  self: {
    classHash: string;
    documentKey: string;
  };
  title: string;
  properties: IDocumentProperties;
  uid: string;
  originDoc: string;
}

export type DBUnpublishedTypedDocumentMetadata = DBOfferingUserProblemDocument | DBOtherDocument;
export type DBPublishedTypedDocumentMetadata = DBPublication | DBOtherPublication;

export type DBProblemOrPublishedDocumentMetadata = DBOfferingUserProblemDocument | DBPublication;
export type DBOtherOrPublishedDocumentMetadata = DBOtherDocument | DBOtherPublication;

export type DBTypedDocumentMetadata = DBUnpublishedTypedDocumentMetadata | DBPublishedTypedDocumentMetadata;

export interface DBClass {
  version: "1.0";
  self: {
    classHash: string;
  };
  offerings: DBOfferingMap;
}

export interface DBOfferingMap {
  [key /* offeringId */: string]: DBOffering;
}

export interface DBOffering {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
  };
  users: DBOfferingUserMap;
  groups: DBOfferingGroupMap;
}

export interface DBOfferingUserMap {
  [key /* uid */: string]: DBOfferingUser;
}

export interface DBOfferingGroupMap {
  [key /* groupId */: string]: DBOfferingGroup;
}

export interface DBOfferingUser {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    uid: string;
  };
  documents?: DBOfferingUserProblemDocumentMap;
  planning?: DBOfferingUserProblemDocumentMap;
  sectionDocuments?: DBOfferingUserSectionDocumentMapDEPRECATED;
  // TDB: store ui information here?
}

// metadata written to {classHash}/offerings/{offeringId}/users/{userId}/documents (for problem documents)
// and to {classHash}/offerings/{offeringId}/users/{userId}/planning (for planning documents)
export interface DBOfferingUserProblemDocument {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    uid: string;
  };
  visibility: "public" | "private";
  documentKey: string; // firebase id of portal user document
}

export interface DBOfferingUserProblemDocumentMap {
  [key: string]: DBOfferingUserProblemDocument;
}

export interface DBOfferingUserSectionDocumentMapDEPRECATED {
  [key /* sectionId */: string]: DBOfferingUserSectionDocumentDEPRECATED;
}

export interface DBOfferingUserSectionDocumentDEPRECATED {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    uid: string;
    sectionId: string;
  };
  visibility: "public" | "private";
  documentKey: string; // firebase id of portal user document
}

export interface DBOfferingGroup {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    groupId: string;
  };
  users?: DBOfferingGroupUserMap;
}

export interface DBOfferingGroupUserMap {
  [key /* uid */: string]: DBOfferingGroupUser;
}

export interface DBOfferingGroupUser {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    groupId: string;
    uid: string;
  };
  connectedTimestamp: number;
  disconnectedTimestamp?: number;
}

export interface DBOtherDocumentMap {
  [key: string]: DBOtherDocument;
}

export interface DBImage {
  version: "1.0";
  self: {
    uid: string;
    classHash: string;
    imageKey: string;
  };
  imageData: string;
  title: string; // may be redundant since we aren't yet allowing user-entered titles
  originalSource: string; // web url or original filename
  createdAt: number;
  createdBy: string;
}

export interface DBBaseSupport {
  self: {
    classHash: string;
    offeringId: string;
    audienceType: AudienceEnum;
    audienceId?: string;
    sectionTarget: SectionTarget;
    key: string;
  };
  version: string;
  uid: string;
  properties: IDocumentProperties;
  timestamp: number;
  type: ESupportType;
  mode?: ESupportMode;
  content: string;
  deleted: boolean;
}

export interface DBTextSupport extends DBBaseSupport {
  type: ESupportType.text;
}

export interface DBDocumentSupport extends DBBaseSupport {
  type: ESupportType.document;
}

export interface DBMulticlassSupport extends DBBaseSupport {
  type: ESupportType.multiclass;
  originDoc: string;
}

export interface DBPublishedSupport extends DBBaseSupport {
  type: ESupportType.publication;
  originDoc: string;
}

export type DBSupport = DBTextSupport | DBDocumentSupport | DBMulticlassSupport | DBPublishedSupport;

export interface DBTileComment {
  content: string;
  uid: string;
  timestamp: number;
  selectionInfo?: string;
  deleted?: boolean;
}

export interface DBUserStar{
  uid: string;
  timestamp: number;
  starred: boolean;
}
