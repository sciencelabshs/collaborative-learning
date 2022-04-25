// This model keeps the documents in sync

import { ContainerAPI } from "./container-api";
import { TreePatchRecord, TreePatchRecordSnapshot } from "./history";
import { TreeAPI } from "./tree-api";
import { DocumentStore } from "./document-store";
import { nanoid } from "nanoid";

export const Container = (initialDocument: any) => {
  const trees: Record<string, TreeAPI> = {};

  const getTreeFromId = (treeId: string) => {
    return trees[treeId];
  };

  const documentStore = DocumentStore.create({document: initialDocument, undoStore: {}}, {
    getTreeFromId,
  });

  const undoStore = documentStore.undoStore;

  const containerAPI: ContainerAPI = {
    updateSharedModel: (historyEntryId: string, callId: string, sourceTreeId: string, snapshot: any) => {
      // Right now this is can be called in 2 cases:
      // 1. when a user changes something in a tree which then updates the
      //    tree's view of the shared model, so the tree wants all copies of
      //    this shared model to be updated.
      // 2. when a user undoes or redoes an action that affects the shared model.
      //    In this case the tree owning the shared model calls updateSharedModel to send
      //    these changes to all of the other trees.
      //
      // If we support trees/tiles having customized views of shared models then this
      // will need to become more complex.
      const applyPromises = Object.entries(trees).map(([treeId, tree]) => {
        if (treeId === sourceTreeId) {
          return;
        }

        // In case #1 the passed in callId comes from the action that updated
        // the shared model view in the tree. This callId will be closed by the
        // tree after updateSharedModel is called. updateSharedModel will be
        // waited for, so it should not be possible for the historyEntry to be
        // closed before this new callId is setup. So really we don't need the
        // callId to be passed, but it can be useful for debugging. 
        // 
        // FIXME: how is callId handled in case #2?
        const applyCallId = nanoid();
        documentStore.startHistoryEntryCall(historyEntryId, applyCallId);
        return tree.applySharedModelSnapshotFromContainer(historyEntryId, applyCallId, snapshot);
      });
      // The contract for this method is to return a Promise<void> so we need the extra
      // then() at the end to do this.
      return Promise.all(applyPromises).then();
    },
    addHistoryEntry: (historyEntryId: string, callId: string, treeId: string, actionName: string, 
        undoable: boolean) => {
      documentStore.createHistoryEntry(historyEntryId, callId, actionName, treeId, undoable);
      return Promise.resolve();
    },
    addTreePatchRecord: (historyEntryId: string, callId: string, record: TreePatchRecordSnapshot) => {
      documentStore.addPatchesToHistoryEntry(historyEntryId, callId, TreePatchRecord.create(record));
    },
    startHistoryEntryCall: (historyEntryId: string, callId: string) => {
      documentStore.startHistoryEntryCall(historyEntryId, callId);
      return Promise.resolve();
    }
  };

  return {undoStore, documentStore, containerAPI, trees};
};
