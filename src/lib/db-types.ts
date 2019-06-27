import { SectionType } from "../models/curriculum/section";
import { AudienceEnum, TeacherSupportSectionTarget } from "../models/stores/supports";

// NOTE: see docs/firebase-schema.md to see a visual hierarchy of these interfaces

export interface DBPortalUser {
  version: "1.0";
  self: {
    uid: string
  };
  latestGroupId: string;
  documentMetadata: DBDocumentMetadataMap;
  documents: DBDocumentMap;
}

export interface DBDocumentMetadataMap {
  // documentKey is same value as DBDocumentMap
  [key /* documentKey */: string]: DBDocumentMetadata;
}

export interface DBDocumentMap {
  // documentKey is generated by push to DBDocumentMap
  [key /* documentKey */: string]: DBDocument;
}

export type DBDocumentType = "section" | "learningLog" | "publication" | "learningLogPublication";
export type DBDocumentMetadata = DBSectionDocumentMetadata |
                                 DBLearningLogDocumentMetadata |
                                 DBPublicationDocumentMetadata |
                                 DBLearningLogPublicationMetadata;

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

export interface DBSectionDocumentMetadata extends DBBaseDocumentMetadata {
  type: "section";
  classHash: string;
  offeringId: string;
}
export interface DBLearningLogDocumentMetadata extends DBBaseDocumentMetadata {
  type: "learningLog";
}
export interface DBPublicationDocumentMetadata extends DBBaseDocumentMetadata {
  type: "publication";
  classHash: string;
  offeringId: string;
}
export interface DBLearningLogPublicationMetadata extends DBBaseDocumentMetadata {
  type: "learningLogPublication";
}

export interface DBGroupUserConnections {
  [key /*userId*/: string]: boolean;
}

export interface DBPublication {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
  };
  documentKey: string;
  groupId: string;
  userId: string;
  sectionId: string;
  groupUserConnections: DBGroupUserConnections;
}

export interface DBLearningLog {
  version: "1.0";
  self: {
    uid: string;
    classHash: string;
    documentKey: string;
  };
  title: string;
}

export interface DBLearningLogPublication {
  version: "1.0";
  self: {
    classHash: string;
    documentKey: string;
  };
  title: string;
  uid: string;
  originDoc: string;
}

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
  sectionDocuments?: DBOfferingUserSectionDocumentMap;
  // TDB: store ui information here?
}

export interface DBOfferingUserSectionDocumentMap {
  [key /* sectionId */: string]: DBOfferingUserSectionDocument;
}

export interface DBOfferingUserSectionDocument {
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

export interface DBSupport {
  self: {
    classHash: string;
    offeringId: string;
    audienceType: AudienceEnum;
    audienceId: string;
    sectionTarget: TeacherSupportSectionTarget;
    key: string;
  };
  timestamp: number;
  content: string;
  deleted: boolean;
}

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
