import React, { useEffect, useState } from "react";
import { useDocumentFromStore, useStores, useUIStore} from "../../hooks/use-stores";
import { useFirestore } from "../../hooks/firestore-hooks";
import { CurriculumDocument, DocumentDocument } from "../../lib/firestore-schema";
import { getSectionTitle } from "../../models/curriculum/section";
import { UserModelType } from "../../models/stores/user";
import { DocumentModelType } from "../../models/document/document";
import { useDocumentCaption } from "../thumbnail/decorated-document-thumbnail-item";
import { ENavTab } from "../../models/view/nav-tabs";
import "./commented-documents.scss";
interface IProps {
  documentObj: CurriculumDocument,
  user?: UserModelType
  handleDocView: (() => void) | undefined;
}
interface PromisedCurriculumDocument extends CurriculumDocument {
  id?: string,
  title?: string,
  numComments?: number
}
interface PromisedDocumentDocument extends DocumentDocument {
  id?: string,
  numComments?: number,
  title?: string
}

//bugs:
//- #1 upon load go to  MyWork or ClassWork tab > CommentsView> DocumentsView ---- crashes
// - #2 upon load (not on MyWork or ClassWork tab) > CommentsView > DocumentsView > then go to MyWork or ClassWork tab
    //-- then click on a Document -- crashes

export const CommentedDocuments: React.FC<IProps> = ({documentObj, user, handleDocView}) => {
  console.log("----- < CommentedDocuments > -----------");
  const [docsCommentedOn, setDocsCommentedOn] = useState<PromisedCurriculumDocument[]>();
  const [db] = useFirestore();
  const cDocsRef = db.collection("curriculum");
  const { unit, problem } = documentObj ;
  const cDocsInScopeRef = cDocsRef
    .where("unit", "==", unit)
    .where("problem", "==", problem)
    .where("network","==", user?.network);


  //MyWork/ClassWork
  const [myWorkDocuments, setMyWorkDocuments] = useState<PromisedDocumentDocument[]>();
  const mDocsRef = db.collection("documents");
  const mDocsInScopeRef = mDocsRef
    .where("network", "==", user?.network);  //option 1
    // .where("network", "==", user?.network) //option 2
    // .where("context_id", "==", "democlass1");//
  const ui = useUIStore();
  const store = useStores();


  //------Curriculum Documents--------
  useEffect(() => {
    // const t0 = performance.now();
    const unsubscribeFromDocs = cDocsInScopeRef.onSnapshot(querySnapshot => {
      const docs = querySnapshot.docs.map(doc => {
        return (
          {
            id: doc.id,
            title: "temp",
            numComments: 0,
            ...doc.data()
          }
        );
      });
      const commentedDocs: PromisedCurriculumDocument[] = [];
      const promiseArr: Promise<void>[] = [];
      for (let doc of docs){
        const docCommentsRef = cDocsRef.doc(doc.id).collection("comments");
        promiseArr.push(docCommentsRef.get().then((qs) => {
          if (qs.empty === false) {
            const firstCharPosition = doc.id.split("_", 4).join("_").length + 1; //first char after 4th _
            const sectionType =  doc.id.substring(firstCharPosition, doc.id.length);
            doc = {...doc, title: getSectionTitle(sectionType), numComments: qs.size};
            commentedDocs.push(doc as PromisedCurriculumDocument);
          }
        }));
      }
      Promise.all(promiseArr).then((results)=>{
        setDocsCommentedOn(commentedDocs);
      }).then(()=>{
        // const t1 = performance.now();
        // console.log(`Call to useEffect1 took ${t1 - t0} milliseconds.`);
      });
      // console.log("-------end useEffect 1----------");
    });
    return () => unsubscribeFromDocs?.();
  },[]);

  // ------MyWork/ClassWork--------
  useEffect(() => {
    //-------promise.all -----------
    // const t0 = performance.now();
    const unsubscribeFromDocs = mDocsInScopeRef.onSnapshot(querySnapshot=>{
      const docs = querySnapshot.docs.map(doc =>{ //convert each element of docs to an object
        return (
          {
            id: doc.id,
            type: doc.data().type,
            numComments: 0,
            title: "temp",
            key: doc.data().key,
            ...doc.data()
          }
        );
      });
      const commentedDocs: PromisedDocumentDocument[]= [];
      const promiseArr: Promise<void>[]=[];
      for (let doc of docs){
        const docCommentsRef = mDocsRef.doc(doc.id).collection("comments");
        promiseArr.push(docCommentsRef.get().then((qs)=>{
          if (qs.empty === false){
            doc = {...doc, numComments: qs.size};
            commentedDocs.push(doc as PromisedDocumentDocument);
          }
        }));
      }

      Promise.all(promiseArr).then(()=>{
        setMyWorkDocuments(commentedDocs);
      }).then(()=>{
        // const t1 = performance.now();
        // console.log("useEffect 2: commentedDocs", commentedDocs);
        // console.log("useEffect 2 t1:", t1);
        // console.log(`Call to useEffect2 took ${t1 - t0} milliseconds.`);
      });
      // console.log("-------end useEffect 2---------");
    });
    return () => unsubscribeFromDocs?.();
  },[]);

  if (!documentObj){
    return <>loading</>;
  }

  return (
    <div>
      {
        docsCommentedOn &&
        (docsCommentedOn).map((doc: PromisedCurriculumDocument, index:number) => {
          let navTab: string;
          if (doc.id?.includes("guide")){
            navTab = ENavTab.kTeacherGuide;
          }
          else {
            navTab = ENavTab.kProblems;
          }
          return (
            <div
              className={"document-box"}
              key={index}
              onClick={() => {
                ui.setActiveNavTab(navTab); //open correct NavTab
                ui.setSelectedTile();
                ui.setFocusDocument(doc.path);
                if (handleDocView !== undefined){
                  handleDocView();
                }
              }}
            >
              <div className={"title"}>
                { doc.unit.toUpperCase() + " " + doc.problem + " " + doc.title}
              </div>
              <div className={"numComments"}>
                {doc.numComments}
              </div>
            </div>
          );
        })
      }
      {
        myWorkDocuments &&
        (myWorkDocuments).map((doc: PromisedDocumentDocument, index: number) =>{
          const sectionDoc =  store.documents.getDocument(doc.key);
          const fullSectionDoc = store.networkDocuments.getDocument(doc.key);
          if (sectionDoc){
            return (
              <MyWorkDocuments
                key={index}
                doc={doc}
                index={index}
                sectionDoc={sectionDoc}
              />
            );
          }
          else {
            console.log("NO SECTION DOC");
            console.log("src > hooks > use-stores.ts try useDocumentFromStore", fullSectionDoc);
          }

        })

      }
    </div>
  );
};

interface JProps {
  doc: any,
  index: number,
  sectionDoc: DocumentModelType,
}

export const MyWorkDocuments: React.FC<JProps> = ({doc, index, sectionDoc}) => {
  const ui = useUIStore();
  const store = useStores();
  console.log("-------- <MyWorkDocuments >----------");
  let navTab: string;
  const myWorkTypes = ["problem", "planning", "learningLog", "personal"];
  const classWorkTypes = ["publication", "learningLogPublication", "personalPublication", "supportPublication"];
  for (let i = 0; i < 4; i++){
    if (doc.type === myWorkTypes[i]){
      navTab = ENavTab.kMyWork;
    }
    if (doc.type === classWorkTypes[i]){
      navTab = ENavTab.kClassWork;
    }
  }


  console.log("-----<MyWorkDocument> -----", doc, index);
  let title;
  title =  useDocumentCaption(sectionDoc as DocumentModelType) + ` | ${doc.key}  | ----- ${doc.type}`;

  if (!title){
    title = `***  | ${doc.title}  | ${doc.key} |  ------  ${doc.type}`;
  }


  return (
    <div
      className={"document-box"}
      onClick={()=>{
        console.log("clicked a mywork/classwork doc");
        ui.setActiveNavTab(navTab); //open correct NavTab
        ui.setSelectedTile();
        console.log("doc.path:", doc.path);
        ui.setFocusDocument(doc.path);
      }}
    >
      <div className={"title"}>
        {title}
      </div>
      <div className={"numComments"}>
        {doc.numComments}
      </div>
    </div>
  );

};

  //   // types I have not accounted for :
  //   //publication, learningLogPublication, personalPublication, supportPublication
