import { DB } from "../db";
import { DBLearningLog } from "../db-types";

export class DBLearningLogsListener {
  private db: DB;
  private learningLogsDocsRef: firebase.database.Reference | null  = null;

  constructor(db: DB) {
    this.db = db;
  }

  public start() {
    this.learningLogsDocsRef = this.db.firebase.ref(this.db.firebase.getLearningLogPath(this.db.stores.user));
    this.learningLogsDocsRef.on("child_added", this.handleLearningLogChildAdded);
    this.learningLogsDocsRef.on("child_changed", this.handleLearningLogChildChanged);
    this.learningLogsDocsRef.on("child_removed", this.handleLearningLogChildRemoved);
  }

  public stop() {
    if (this.learningLogsDocsRef) {
      this.learningLogsDocsRef.off("child_added", this.handleLearningLogChildAdded);
      this.learningLogsDocsRef.off("child_changed", this.handleLearningLogChildChanged);
      this.learningLogsDocsRef.off("child_removed", this.handleLearningLogChildRemoved);
    }
  }

  private handleLearningLogChildAdded = (snapshot: firebase.database.DataSnapshot) => {
    const {documents} = this.db.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      this.db.createDocumentFromLearningLog(learningLog)
        .then(this.db.listeners.monitorLearningLogDocument)
        .then(documents.add);
    }
  }

  private handleLearningLogChildChanged = (snapshot: firebase.database.DataSnapshot) => {
    const {documents} = this.db.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      const learningLogWorkspace = documents.getDocument(learningLog.self.documentKey);
      if (learningLogWorkspace) {
        learningLogWorkspace.setTitle(learningLog.title);
      }
    }
  }

  private handleLearningLogChildRemoved = (snapshot: firebase.database.DataSnapshot) => {
    const {documents} = this.db.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      const learningLogWorkspace = documents.getDocument(learningLog.self.documentKey);
      if (learningLogWorkspace) {
        documents.remove(learningLogWorkspace);
        // TODO: still need UI story for delete
      }
    }
  }
}