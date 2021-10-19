import firebase from "firebase/app";
import { observable, makeObservable } from "mobx";
import { IDisposer, onSnapshot } from "mobx-state-tree";

import { DB, Monitor } from "../db";
// import { LogEventName, Logger } from "../logger";
import { DBLatestGroupIdListener } from "./db-latest-group-id-listener";
import { DBGroupsListener } from "./db-groups-listener";
import { DBOtherDocumentsListener } from "./db-other-docs-listener";
import { DBProblemDocumentsListener } from "./db-problem-documents-listener";
import { DBPublicationsListener } from "./db-publications-listener";
import { DocumentModelType } from "../../models/document/document";
import { DocumentContentModel } from "../../models/document/document-content";
import { LearningLogDocument, OtherDocumentType, PersonalDocument } from "../../models/document/document-types";
import { DBDocument, DatabaseType } from "../db-types";
import { DBSupportsListener } from "./db-supports-listener";
import { DBCommentsListener } from "./db-comments-listener";
import { DBStarsListener } from "./db-stars-listener";
import { BaseListener } from "./base-listener";

export interface ModelListeners {
  [key /* unique Key */: string]: {
    ref?: firebase.database.Reference;
    modelDisposer?: IDisposer;
  } | undefined;
}

export interface UserProblemDocumentListeners {
  [key /* sectionId */: string]: {
    [key /* userId */: string]: {
      problemDocsRef?: firebase.database.Reference;
      docContentRef?: firebase.database.Reference;
    };
  };
}

export interface DocumentModelDisposers {
  [key /* sectionId */: string]: IDisposer;
}

export class DBListeners extends BaseListener {
  @observable public isListening = false;
  private db: DB;

  private modelListeners: ModelListeners = {};
  private documentModelDisposers: DocumentModelDisposers = {};

  private latestGroupIdListener: DBLatestGroupIdListener;
  private groupsListener: DBGroupsListener;
  private problemDocumentsListener: DBProblemDocumentsListener;
  private personalDocumentsListener: DBOtherDocumentsListener;
  private learningLogsListener: DBOtherDocumentsListener;
  private publicationListener: DBPublicationsListener;
  private supportsListener: DBSupportsListener;
  private commentsListener: DBCommentsListener;
  private starsListener: DBStarsListener;

  constructor(db: DB) {
    super("DBListeners");
    makeObservable(this);
    this.db = db;
    this.latestGroupIdListener = new DBLatestGroupIdListener(db);
    this.groupsListener = new DBGroupsListener(db);
    this.problemDocumentsListener = new DBProblemDocumentsListener(db);
    this.personalDocumentsListener = new DBOtherDocumentsListener(db, PersonalDocument);
    this.learningLogsListener = new DBOtherDocumentsListener(db, LearningLogDocument);
    this.publicationListener = new DBPublicationsListener(db);
    this.supportsListener = new DBSupportsListener(db);
    this.commentsListener = new DBCommentsListener(db);
    this.starsListener = new DBStarsListener(db);
  }

  public async start() {
    // listeners must start in this order so we know the latest group joined so we can autojoin groups if needed
    await this.latestGroupIdListener.start();
    // start group and document listeners
    await Promise.all([
      this.groupsListener.start(),
      this.problemDocumentsListener.start(),
      this.personalDocumentsListener.start(),
      this.learningLogsListener.start(),
      this.publicationListener.start(),
      this.supportsListener.start()
    ]);
    // start listeners that depend on documents
    await Promise.all([
      this.commentsListener.start(),
      this.starsListener.start()
    ]);

    this.isListening = true;
  }

  public stop() {
    this.isListening = false;

    this.stopModelListeners();
    this.callDocumentModelDisposers();

    this.starsListener.stop();
    this.commentsListener.stop();
    this.supportsListener.stop();
    this.publicationListener.stop();
    this.learningLogsListener.stop();
    this.personalDocumentsListener.stop();
    this.problemDocumentsListener.stop();
    this.groupsListener.stop();
    this.latestGroupIdListener.stop();
  }

  public getOrCreateModelListener(uniqueKeyForModel: string) {
    return this.modelListeners[uniqueKeyForModel] || (this.modelListeners[uniqueKeyForModel] = {});
  }

  public monitorDocumentVisibility = (document: DocumentModelType) => {
    const { user } = this.db.stores;
    const updateRef = this.db.firebase.ref(this.db.firebase.getProblemDocumentPath(user, document.key));
    const disposer = (onSnapshot(document, (newDocument) => {
      updateRef.update({
        visibility: newDocument.visibility
      });
    }));
    this.documentModelDisposers[document.key] = disposer;
  }

  public monitorOtherDocument = (document: DocumentModelType, type: OtherDocumentType) => {
    const { user } = this.db.stores;
    const { key } = document;

    const listenerKey = type === PersonalDocument
                          ? `personalDocument:${key}`
                          : `learningLogWorkspace:${key}`;
    const listener = this.getOrCreateModelListener(listenerKey);
    if (listener.modelDisposer) {
      listener.modelDisposer();
    }

    const updatePath = type === PersonalDocument
                        ? this.db.firebase.getUserPersonalDocPath(user, key)
                        : this.db.firebase.getLearningLogPath(user, key);
    const updateRef = this.db.firebase.ref(updatePath);
    listener.modelDisposer = (onSnapshot(document, (newDocument) => {
      updateRef.update({
        title: newDocument.title,
        properties: newDocument.properties
        // TODO: for future ordering story add original to model and update here
      });
    }));

    return document;
  }

  public monitorPersonalDocument = (document: DocumentModelType) => {
    return this.monitorOtherDocument(document, PersonalDocument);
  }

  public monitorLearningLogDocument = (document: DocumentModelType) => {
    return this.monitorOtherDocument(document, LearningLogDocument);
  }

  public monitorDocument = (document: DocumentModelType, monitor: Monitor) => {
    this.debugLog("#monitorDocument", `document: ${document.key} monitor: ${monitor}`);
    this.monitorDocumentRef(document, monitor);
    this.monitorDocumentModel(document, monitor);
  }

  public unmonitorDocument = (document: DocumentModelType, monitor: Monitor) => {
    this.debugLog("#unmonitorDocument", `document: ${document.key} monitor: ${monitor}`);
    this.unmonitorDocumentRef(document);
    this.unmonitorDocumentModel(document);
  }

  public syncDocumentProperties = (document: DocumentModelType, dbType: DatabaseType, path?: string) => {
    const { user } = this.db.stores;
    const { key, properties } = document;

    if (dbType === "firebase") {
      const updatePath = path || this.db.firebase.getUserDocumentPath(user, key, document.uid);
      const updateRef = this.db.firebase.ref(updatePath);
      // synchronize document property changes to firebase
      onSnapshot(properties, newProperties => {
        updateRef.update({ properties: newProperties });
      });
    }
    else if (dbType === "firestore") {
      const docRef = this.db.firestore.getMulticlassSupportDocumentRef(key);
      // synchronize document property changes to firestore
      onSnapshot(properties, newProperties => {
        docRef.update({ properties: newProperties });
      });
    }
  }

  private monitorDocumentRef = (document: DocumentModelType, monitor: Monitor) => {
    const { user, documents } = this.db.stores;
    const documentKey = document.key;
    const documentPath = this.db.firebase.getUserDocumentPath(user, documentKey, document.uid);
    const documentRef = this.db.firebase.ref(documentPath);

    if (monitor === Monitor.None) {
      return;
    }

    const docListener = this.db.listeners.getOrCreateModelListener(`document:${documentKey}`);
    if (docListener.ref) {
      docListener.ref.off("value");
    }
    docListener.ref = documentRef;

    // for remote documents keep the local document in sync with Firebase but local documents
    // just load it once and then sync local changes to Firebase
    documentRef[monitor === Monitor.Remote ? "on" : "once"]("value", (snapshot) => {
      if (snapshot && snapshot.val()) {
        const updatedDoc: DBDocument = snapshot.val();
        const updatedContent = this.db.parseDocumentContent(updatedDoc);
        const documentModel = documents.getDocument(documentKey);
        if (documentModel) {
          documentModel.setContent(DocumentContentModel.create(updatedContent || {}));
          this.monitorDocumentModel(documentModel, monitor);
        }
      }
    });
  }

  private unmonitorDocumentRef = (document: DocumentModelType) => {
    const docListener = this.modelListeners[`document:${document.key}`];
    if (docListener && docListener.ref) {
      docListener.ref.off("value");
    }
  }

  private monitorDocumentModel = (document: DocumentModelType, monitor: Monitor) => {
    // skip if not monitoring local changes
    if (monitor !== Monitor.Local) {
      return;
    }

    const { user } = this.db.stores;
    const { key, content } = document;

    const docListener = this.db.listeners.getOrCreateModelListener(`document:${key}`);
    if (docListener.modelDisposer) {
      docListener.modelDisposer();
    }
    else {
      // Only log the first time we monitor the document. We generally monitor/unmonitor/remonitor
      // several times during startup, but this function always adds monitoring as the last step,
      // so logging the first instance is sufficient for our purposes.
      // Logger.log(LogEventName.INTERNAL_MONITOR_DOCUMENT,
      //           { type: document.type, key: document.key, uid: document.uid, groupId: document.groupId });
    }

    const updatePath = this.db.firebase.getUserDocumentPath(user, key, document.uid);
    const updateRef = this.db.firebase.ref(updatePath);
    if (content) {
      docListener.modelDisposer = onSnapshot(content, (newContent) => {
                                    document.incChangeCount();
                                    updateRef.update({
                                      content: JSON.stringify(newContent),
                                      changeCount: document.changeCount
                                    })
                                    .then(() => {
                                      // console.log("Successful save", "document:", document.key,
                                      //             "changeCount:", document.changeCount);
                                    })
                                    .catch(() => {
                                      user.setIsFirebaseConnected(false);
                                      // console.warn("Failed save!", "document:", document.key,
                                      //             "changeCount:", document.changeCount);
                                    });
                                  });
    }
  }

  private unmonitorDocumentModel = (document: DocumentModelType) => {
    // This is currently only called for unmonitoring remote documents as a result of group changes, but
    // if it were to be called for a user's own document the result would be not saving the user's work.
    const { user } = this.db.stores;
    if (user.id === document.uid) {
      // Logger.log(LogEventName.INTERNAL_UNMONITOR_DOCUMENT,
      //           { type: document.type, key: document.key, uid: document.uid, groupId: document.groupId });
    }
    const docListener = this.modelListeners[`document:${document.key}`];
    docListener?.modelDisposer?.();
  }

  private stopModelListeners() {
    Object.keys(this.modelListeners).forEach((docKey) => {
      const listeners = this.modelListeners[docKey];
      if (listeners) {
        if (listeners.modelDisposer) {
          listeners.modelDisposer();
        }

        if (listeners.ref) {
          listeners.ref.off();
        }
      }
    });
  }

  private callDocumentModelDisposers() {
    Object.keys(this.documentModelDisposers).forEach((sectionId) => {
      this.documentModelDisposers[sectionId]();
    });
  }
}
