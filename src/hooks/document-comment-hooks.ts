import firebase from "firebase/app";
import { useCallback } from "react";
import { useMutation, UseMutationOptions, useQuery } from "react-query";
import { ICommentableDocumentParams, IPostDocumentCommentParams, isSectionPath } from "../../functions/src/shared";
import { CommentDocument, CurriculumDocument, DocumentDocument } from "../lib/firestore-schema";
import { useCollectionOrderedRealTimeQuery, useFirestore } from "./firestore-hooks";
import { useFirebaseFunction } from "./use-firebase-function";
import { useDocumentOrCurriculumMetadata, useNetworkDocumentKey } from "./use-stores";
import { useUserContext } from "./use-user-context";

/*
 * useCommentableDocumentPath
 *
 * For now, parses the specified key to see if it looks like a curriculum document path,
 * otherwise assumes it's a document key.
 */
export const useCommentableDocumentPath = (documentKeyOrSectionPath: string) => {
  const docKey = useNetworkDocumentKey(documentKeyOrSectionPath);
  if (!documentKeyOrSectionPath) return documentKeyOrSectionPath;
  // if it looks like a section path, assume it's a curriculum document reference
  return isSectionPath(documentKeyOrSectionPath)
          ? `curriculum/${docKey}`
          : `documents/${docKey}`;
};

/*
 * useCommentsCollectionPath
 *
 * For now, parses the specified key to see if it looks like a curriculum document path,
 * otherwise assumes it's a document key.
 */
export const useCommentsCollectionPath = (documentKeyOrSectionPath: string) => {
  const docPath = useCommentableDocumentPath(documentKeyOrSectionPath);
  if (!documentKeyOrSectionPath) return documentKeyOrSectionPath;
  return `${docPath}/comments`;
};

/*
 * useValidateCommentableDocument
 *
 * Implemented via React Query's useMutation hook.
 */
type IValidateDocumentClientParams = Omit<ICommentableDocumentParams, "context">;
type ValidateDocumentUseMutationOptions =
      UseMutationOptions<firebase.functions.HttpsCallableResult, unknown, IValidateDocumentClientParams>;

export const useValidateCommentableDocument = (options?: ValidateDocumentUseMutationOptions) => {
  const validateCommentableDocument = useFirebaseFunction<ICommentableDocumentParams>("validateCommentableDocument_v1");
  const context = useUserContext();
  const validateDocument = useCallback((clientParams: IValidateDocumentClientParams) => {
    return validateCommentableDocument({ context, ...clientParams });
  }, [context, validateCommentableDocument]);
  return useMutation(validateDocument, options);
};

/*
 * useCommentableDocument
 *
 * Checks whether the specified document exists and creates it if not.
 * Implemented via React Query's useQuery hook.
 */
export type DocumentQueryType = CurriculumDocument | DocumentDocument | undefined;
export const useCommentableDocument = (documentKeyOrSectionPath?: string) => {
  const [firestore, firestoreRoot] = useFirestore();
  const documentPath = useCommentableDocumentPath(documentKeyOrSectionPath || "");
  const documentMetadata = useDocumentOrCurriculumMetadata(documentKeyOrSectionPath);
  const validateDocumentMutation = useValidateCommentableDocument();
  return useQuery(documentPath, () => new Promise<DocumentQueryType>((resolve, reject) => {
    const documentRef = firestore.documentRef(`${firestoreRoot}/${documentPath}`);
    const unsubscribeDocListener = documentRef?.onSnapshot({
      next: docSnapshot => {
        unsubscribeDocListener?.();
        resolve(docSnapshot.data() as DocumentQueryType);
      },
      error: readError => {
        unsubscribeDocListener?.();
        // an error presumably means that the document doesn't exist yet, so we create it
        validateDocumentMutation.mutate({ document: documentMetadata! }, {  // ! since query won't run otherwise
          onSuccess: result => resolve(result.data),
          onError: createError => { throw createError; }
        });
      }
    });
  }), { // useQuery options
    enabled: !!documentPath && !!documentMetadata,  // don't run the query if we don't have prerequisites
    staleTime: Infinity,                            // never need to rerun the query once it succeeds
    cacheTime: 60 * 60 * 1000                       // keep it in cache for 60 minutes
  });
};

/*
 * usePostDocumentComment
 *
 * Implemented via React Query's useMutation hook.
 */
type IPostDocumentCommentClientParams = Omit<IPostDocumentCommentParams, "context">;
type PostDocumentCommentUseMutationOptions =
      UseMutationOptions<firebase.functions.HttpsCallableResult, unknown, IPostDocumentCommentClientParams>;

export const usePostDocumentComment = (options?: PostDocumentCommentUseMutationOptions) => {
  const postDocumentComment = useFirebaseFunction<IPostDocumentCommentParams>("postDocumentComment_v1");
  const context = useUserContext();
  const postComment = useCallback((clientParams: IPostDocumentCommentClientParams) => {
    return postDocumentComment({ context, ...clientParams });
  }, [context, postDocumentComment]);
  return useMutation(postComment, options);
};

const commentConverter = {
  toFirestore: (comment: CommentDocument) => {
    const { createdAt: createdAtDate, ...others } = comment;
    // Convert JS Date (if provided) to Firestore Timestamp; we generally let Firestore provide the
    // timestamp, so client-provided timestamps are unlikely to occur, but we handle them just in case.
    const createdAt = createdAtDate ? firebase.firestore.Timestamp.fromDate(createdAtDate) : undefined;
    return { createdAt, ...others };
  },
  fromFirestore: (doc: firebase.firestore.QueryDocumentSnapshot): CommentDocument => {
    const { createdAt, ...others } = doc.data();
    // Convert Firestore Timestamp to JavaScript Date
    return { createdAt: createdAt?.toDate(), ...others } as CommentDocument;
  }
};

/*
 * useDocumentComments
 *
 * Sets up a Firestore real-time query which returns the comments associated with the
 * specified document. The documentKey can be either a curriculum section path or the
 * key of a user document in Firebase. The returned results are managed by React Query,
 * e.g. caching and reuse if multiple clients request the same comments.
 */
export const useDocumentComments = (documentKeyOrSectionPath?: string) => {
  const { isSuccess } = useCommentableDocument(documentKeyOrSectionPath);
  const path = useCommentsCollectionPath(documentKeyOrSectionPath || "");
  const queryPath = isSuccess ? path : "";
  const converter = commentConverter;
  return useCollectionOrderedRealTimeQuery(queryPath, { converter, orderBy: "createdAt" });
};

/*
 * useUnreadDocumentComments
 *
 * Shares the same Firestore real-time listener as the previous hook but filters the results
 * to return unread messages. We don't have an implementation for this yet, but this hook
 * serves as a placeholder. Eventually, we will need to figure out whether this will be
 * based on a single timestamp, or a separate timestamp for each thread, or flags for each
 * message indicated which have been read, etc.
 */
export const useUnreadDocumentComments = (documentKeyOrSectionPath?: string) => {
  // TODO: figure this out; for now it's just a comment counter
  return useDocumentComments(documentKeyOrSectionPath);
};