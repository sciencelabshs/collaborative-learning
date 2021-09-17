import firebase from "firebase";
import {
  adminWriteDoc, expectDeleteToFail, expectDeleteToSucceed, expectReadToFail, expectReadToSucceed,
  expectUpdateToFail, expectUpdateToSucceed, expectWriteToFail, expectWriteToSucceed, genericAuth,
  initFirestore, mockTimestamp, noNetwork, prepareEachTest, studentAuth, teacher2Auth, teacher2Id, teacherAuth,
  teacherId, teacherName, tearDownTests, thisClass
} from "./setup-rules-tests";

describe("Firestore security rules", () => {

  let db: firebase.firestore.Firestore;

  beforeEach(async () => {
    await prepareEachTest();
  });

  afterAll(async () => {
    await tearDownTests();
  });

  const kDocumentDocPath = "authed/myPortal/documents/myDocument";

  interface ISpecDocumentDoc {
    add?: Record<string, string | string[] | object>;
    remove?: string[];
  }
  function specDocumentDoc(options?: ISpecDocumentDoc) {
    // a valid document specification
    const documentDoc = { context_id: thisClass, network: noNetwork, teachers: [teacherId], uid: teacherId,
                          type: "problemDocument", key: "my-document", createdAt: mockTimestamp() };
    // remove specified props for validating the tests that require them
    options?.remove?.forEach(prop => delete (documentDoc as any)[prop]);
    // add additional props to test behavior of additional props
    options?.add && Object.keys(options.add).forEach(prop => {
      (documentDoc as any)[prop] = options.add?.[prop];
    });
    return documentDoc;
  }

  describe("user documents", () => {
    it("unauthenticated users can't read authenticated user documents", async () => {
      db = initFirestore();
      await expectReadToFail(db, kDocumentDocPath);
    });

    it("unauthenticated users can't write user documents", async () => {
      db = initFirestore();
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc());
    });

    it("authenticated generic users can't read authenticated user documents", async () => {
      db = initFirestore(genericAuth);
      await expectReadToFail(db, kDocumentDocPath);
    });

    it("authenticated generic users can't write user documents", async () => {
      db = initFirestore(genericAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc());
    });

    it("authenticated teachers can read their own user documents", async () => {
      db = initFirestore(teacherAuth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectReadToSucceed(db, kDocumentDocPath);
    });

    it("authenticated teachers can't write user documents without required uid", async () => {
      db = initFirestore(teacherAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc({ remove: ["uid"] }));
    });

    it("authenticated teachers can't write user documents without required network", async () => {
      db = initFirestore(teacherAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc({ remove: ["network"] }));
    });

    it("authenticated teachers can't write user documents without required type", async () => {
      db = initFirestore(teacherAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc({ remove: ["type"] }));
    });

    it("authenticated teachers can't write user documents without required key", async () => {
      db = initFirestore(teacherAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc({ remove: ["key"] }));
    });

    it("authenticated teachers can write user documents", async () => {
      db = initFirestore(teacherAuth);
      await expectWriteToSucceed(db, kDocumentDocPath, specDocumentDoc());
    });

    it("authenticated teachers can update user documents", async () => {
      db = initFirestore(teacherAuth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectUpdateToSucceed(db, kDocumentDocPath, { title: "new-title" });
    });

    it("authenticated teachers can't update user documents' read-only fields", async () => {
      db = initFirestore(teacherAuth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectUpdateToFail(db, kDocumentDocPath, { title: "new-title", uid: teacher2Id });
    });

    it("authenticated teachers can't update other teachers' documents", async () => {
      db = initFirestore(teacher2Auth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectUpdateToFail(db, kDocumentDocPath, { title: "new-title" });
    });

    it("authenticated teachers can delete user documents", async () => {
      db = initFirestore(teacherAuth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectDeleteToSucceed(db, kDocumentDocPath);
    });

    it("authenticated teachers can't delete other teachers' documents", async () => {
      db = initFirestore(teacher2Auth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectDeleteToFail(db, kDocumentDocPath);
    });

    it("authenticated students can't read user documents", async () => {
      db = initFirestore(studentAuth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
      await expectReadToFail(db, kDocumentDocPath);
    });

    it("authenticated students can't write user documents", async () => {
      db = initFirestore(studentAuth);
      await expectWriteToFail(db, kDocumentDocPath, specDocumentDoc());
    });

  });

  describe("teacher document comments", () => {
    const kDocumentCommentDocPath = `${kDocumentDocPath}/comments/myComment`;

    interface ISpecCommentDoc {
      add?: Record<string, string | string[] | object>;
      remove?: string[];
    }
    function specCommentDoc(options?: ISpecCommentDoc) {
      // a valid comment document specification
      const commentDoc = { uid: teacherId, name: teacherName, network: noNetwork,
                            content: "A comment!", createdAt: mockTimestamp() };
      // remove specified props for validating the tests that require them
      options?.remove?.forEach(prop => delete (commentDoc as any)[prop]);
      // add additional props to test behavior of additional props
      options?.add && Object.keys(options.add).forEach(prop => {
        (commentDoc as any)[prop] = options.add?.[prop];
      });
      return commentDoc;
    }

    const initFirestoreWithUserDocument = async (auth?: any) => {
      db = initFirestore(auth);
      await adminWriteDoc(kDocumentDocPath, specDocumentDoc());
    };

    it("unauthenticated users can't read document comments", async () => {
      await initFirestoreWithUserDocument();
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectReadToFail(db, kDocumentCommentDocPath);
    });

    it("unauthenticated users can't write document comments", async () => {
      await initFirestoreWithUserDocument();
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc());
    });

    it("authenticated generic users can't read document comments", async () => {
      await initFirestoreWithUserDocument(genericAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectReadToFail(db, kDocumentCommentDocPath);
    });

    it("authenticated generic users can't write document comments", async () => {
      await initFirestoreWithUserDocument(genericAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc());
    });

    it("authenticated teachers can read their own document comments", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectReadToSucceed(db, kDocumentCommentDocPath);
    });

    it("authenticated teachers can't write document comments without required uid", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc({ remove: ["uid"] }));
    });

    it("authenticated teachers can't write document comments without required name", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc({ remove: ["name"] }));
    });

    it("authenticated teachers can't write document comments without required name", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc({ remove: ["content"] }));
    });

    it("authenticated teachers can't write document comments with inconsistent network", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc({ add: { network: "other-network" } }));
    });

    it("authenticated teachers can write document comments", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await expectWriteToSucceed(db, kDocumentCommentDocPath, specCommentDoc());
    });

    it("authenticated teachers can't update document comments' read-only uid field", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectUpdateToFail(db, kDocumentCommentDocPath, { content: "A new comment!", uid: teacher2Id });
    });

    it("authenticated teachers can't update document comments' read-only network field", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectUpdateToFail(db, kDocumentCommentDocPath, { content: "A new comment!", network: "other-network" });
    });

    it("authenticated teachers can update document comments", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectUpdateToSucceed(db, kDocumentCommentDocPath, { content: "A new comment!" });
    });

    it("authenticated teachers can't update other teachers' document comments", async () => {
      await initFirestoreWithUserDocument(teacher2Auth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectUpdateToFail(db, kDocumentCommentDocPath, { content: "A new comment!" });
    });

    it("authenticated teachers can delete document comments", async () => {
      await initFirestoreWithUserDocument(teacherAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectDeleteToSucceed(db, kDocumentCommentDocPath);
    });

    it("authenticated teachers can't delete other teachers' document comments", async () => {
      await initFirestoreWithUserDocument(teacher2Auth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectDeleteToFail(db, kDocumentCommentDocPath);
    });

    it("authenticated students can't read document comments", async () => {
      await initFirestoreWithUserDocument(studentAuth);
      await adminWriteDoc(kDocumentCommentDocPath, specCommentDoc());
      await expectReadToFail(db, kDocumentCommentDocPath);
    });

    it("authenticated students can't write document comments", async () => {
      await initFirestoreWithUserDocument(studentAuth);
      await expectWriteToFail(db, kDocumentCommentDocPath, specCommentDoc());
    });

  });

});