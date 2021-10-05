import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  IGetNetworkResourceListUnionParams, INetworkResourceClassResponse, INetworkResourceOfferingResponse, isWarmUpParams
} from "./shared";
import { validateUserContext } from "./user-context";

// update this when deploying updates to this function
const version = "1.0.0";

export async function getNetworkResources(
                        params?: IGetNetworkResourceListUnionParams,
                        callableContext?: functions.https.CallableContext) {
  if (isWarmUpParams(params)) return { version };

  const { context, problem } = params || {};
  const { appMode, classHash: userContextId, network } = context || {};
  const { isValid, uid, classPath, firestoreRoot } = validateUserContext(context, callableContext?.auth);
  if (!context || !isValid || !userContextId || !network || !uid) {
    throw new functions.https.HttpsError("invalid-argument", "The provided user context is not valid.");
  };

  // validate that authenticated users are in the network they claim to be in
  if (appMode === "authed") {
    const userDocResult = await admin.firestore().doc(`/${firestoreRoot}/users/${uid}`).get();
    if (!userDocResult.exists || (userDocResult.data()?.network !== network)) {
      throw new functions.https.HttpsError("invalid-argument", "The provided user network is not valid.");
    }
  }

  // query for set of offerings matching the requested problem
  const classOfferings: Record<string, string[]> = {};
  const offerings = await admin.firestore()
                            .collection(`/${firestoreRoot}/offerings`)
                            .where("network", "==", network)
                            .where("problemPath", "==", problem)
                            .get();
  // determine the set of classes containing those problems
  offerings.forEach(offering => {
    const { context_id, id } = offering.exists
                                ? offering.data()
                                // https://github.com/Microsoft/TypeScript/issues/26235#issuecomment-452955161
                                : {} as Partial<NonNullable<{ context_id: string, id: string }>>;
    if (!classOfferings[context_id]) {
      classOfferings[context_id] = [];
    }
    classOfferings[context_id].push(id);
  });
  // map to array of classes with subarray of offerings
  const classes = Object.keys(classOfferings).map(context_id => {
    return { context_id, resource_link_ids: classOfferings[context_id] };
  });

  // lop off the last element of the path to get the root
  const databaseRoot = classPath.split("/").slice(0, -1).join("/");

  // return a promise for each class
  const classPromises: Promise<INetworkResourceClassResponse>[] = [];
  classes?.forEach(async ({ context_id, resource_link_ids }) => {
    classPromises.push(new Promise(async (resolveClass, rejectClass) => {
      try {
        const classDoc = await admin.firestore().doc(`/${firestoreRoot}/classes/${network}_${context_id}`).get();
        const isValidClassNetwork = classDoc.exists && (classDoc.data()?.network === network);
        // return a promise for each offering within the class
        const offeringPromises: Promise<INetworkResourceOfferingResponse>[] = [];
        resource_link_ids.forEach(resource_link_id => {
          const offeringRoot = `${databaseRoot}/${context_id}/offerings/${resource_link_id}`;
          offeringPromises.push(new Promise(async (resolveOffering, rejectOffering) => {
            if (isValidClassNetwork) {
              // return promises for individual metadata requests
              try {
                const [problemPublicationsSnap, personalPublicationsSnap] = await Promise.all([
                  admin.database().ref(`${offeringRoot}/publications`).get(),
                  admin.database().ref(`${offeringRoot}/personalPublications`).get()
                ]);
                const problemPublications = problemPublicationsSnap.val() || undefined;
                const personalPublications = personalPublicationsSnap.val() || undefined;
                // ultimately, teacher problem/planning documents will be returned under each teacher
                const teachers = classDoc.data()?.teachers.map((_uid: string) => ({ uid: _uid })) || [];
                resolveOffering({ resource_link_id, problemPublications, personalPublications, teachers });
              }
              catch(e) {
                // on error we just don't return any resources for the offering
                resolveOffering({ resource_link_id });
              }
            }
            else {
              // on error we just don't return any resources for the offering
              resolveOffering({ resource_link_id });
            }
          }));
        });
        const classDocData = classDoc?.exists ? classDoc.data() : {};
        const { id, name, uri, teacher, teachers } = classDocData || {};
        const classData = classDocData ? { id, name, uri, teacher, teachers } : {};
        const resources = await Promise.all(offeringPromises);
        resolveClass({ context_id, ...classData, resources })
      }
      catch(e) {
        // on error we just don't return any resources for the class
        resolveClass({ context_id, resources: [] });
      }
    }));
  });

  const response = await Promise.all(classPromises);
  return { version, response };
};
