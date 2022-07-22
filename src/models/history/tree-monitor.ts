import { addDisposer, addMiddleware, createActionTrackingMiddleware2, flow, 
    getPath, 
    IActionTrackingMiddleware2Call, IJsonPatch, Instance, IPatchRecorder, isActionContextThisOrChildOf, 
    isAlive, recordPatches } from "mobx-state-tree";
import { nanoid } from "nanoid";
import { TreeManagerAPI } from "./tree-manager-api";
import { TreePatchRecordSnapshot } from "./history";
import { Tree } from "./tree";

interface CallEnv {
    recorder: IPatchRecorder;
    sharedModelModifications: SharedModelModifications;
    historyEntryId: string;
    exchangeId: string;
}

type SharedModelModifications = Record<string, number>;

export const addTreeMonitor = (tree: Instance<typeof Tree>,  manager: TreeManagerAPI, includeHooks: boolean) => {
    let recordingDisabled = 0;

    const treeMonitorMiddleware = createActionTrackingMiddleware2<CallEnv>({
        filter(call) {
            if (call.env) {
                // already recording
                return false;
            }
            return true;
        },
        onStart(call) {
            // DEBUG:
            // console.log("onStart", getActionName(call));
            const sharedModelModifications: SharedModelModifications = {};

            let historyEntryId;
            let exchangeId;

            // TODO: this seems like a bit of a hack. We are looking for
            // specific actions which we know include a historyEntryId and
            // exchangeId as their first two arguments. This is so we can link
            // all of the changes with this same historyEntryId and exchangeId.
            // These actions are all defined on the common `Tree` model which is
            // composed into the actual root of the MST tree. So at least the
            // specific trees are not defining these actions themselves.
            //
            // I can't think of a better way so far. If a function in this
            // middleware could apply the snapshots and run the syncing that
            // would let us directly pass in the historyEntryId. However we
            // still need to record the changes in the undo history. So we still
            // need this to pass through as an action so the middleware can
            // record it.
            //
            // We could use the `decorate` feature of MST to at least make it
            // more clear in the Tile model that these actions are special. 
            if (isActionFromManager(call)) {
                historyEntryId = call.args[0];
                exchangeId = call.args[1];
            } else {
                historyEntryId = nanoid();
                exchangeId = nanoid();
            }

            const recorder = recordPatches(
                call.tree,
                (_patch, _inversePatch, actionContext) => {
                    if (recordingDisabled) {
                        return false;
                    }

                    // See if the patch is modifying one of the mounted shared
                    // models or shared model views.
                    //
                    // If it is a shared model view, then don't record this
                    // patch.
                    //
                    // Also track the modification so we can notify the tree
                    // when the action is done. The tree needs to know about
                    // these modifications so it tell the tiles to update
                    // themselves based on the changes in the shared model or
                    // shared model view. And the manager needs to know about
                    // the shared model changes so it can send them any other
                    // trees.
                    //
                    // This is kind of a hack, but we identify the shared model
                    // changes based on their path in the document.
                    // CLUE doesn't support shared model views yet, so we just
                    // look for shared models in the sharedModelMap of the
                    // document. 
                    //
                    // This should only match changes to the shared models themselves
                    // not the map and not when a new tile is referencing a shared model.
                    // 
                    // When a new shared model is added to the document the path will be
                    //   /content/sharedModelMap/${sharedModelId}]
                    // We a new tile is referencing a shared model the path will be:
                    //   /content/sharedModelMap/${sharedModelId}/tiles/[index]
                    //
                    // When a new shared model is added via addTileSharedModel the
                    // shared model manager will call updateAfterSharedModelChanges after it
                    // adds model to the document and tile to the entry. So there currently
                    // isn't a need for the tree monitor to handle that case.
                    const match = _patch.path.match(/(.*\/content\/sharedModelMap\/[^/]+\/sharedModel)\//);
                    if(match) {
                        const sharedModelPath = match[1];

                        if (!sharedModelModifications[sharedModelPath]) {
                            sharedModelModifications[sharedModelPath] = 1;
                        } else {
                            // increment the number of modifications made to the shared model
                            sharedModelModifications[sharedModelPath]++;
                        }

                        // If this is a shared model view, we shouldn't record the
                        // patch.
                        // Currently CLUE doesn't support shared model views.
                        // return false;
                    }

                    // only record patches that were generated by this action or children of this action
                    return (
                        !!actionContext && isActionContextThisOrChildOf(actionContext, call.id)
                    );
                }
            );
            recorder.resume();

            call.env = {
                recorder,
                sharedModelModifications,
                historyEntryId,
                exchangeId
            };
        },
        onFinish(call, error) {
            const { recorder, sharedModelModifications, historyEntryId, exchangeId } = call.env || {};
            if (!recorder || !sharedModelModifications || !historyEntryId || !exchangeId) {
                throw new Error(`The call.env is corrupted: ${ JSON.stringify(call.env)}`);
            }
            call.env = undefined;
            recorder.stop();

            if (error === undefined) {
                // Note: This function is async because it needs to wait for the
                // manager to respond, to the start call before finishing the
                // action. The changes are stored in the recorder so even if the
                // tree has changed again before those changes are sent they
                // will be untouched. However if a shared model has been
                // modified the state of the shared model is captured just
                // before it is sent so the shared model might change again.
                // This is actually OK because this shared model state sending
                // is just to synchronize other views of the shared model in
                // other trees, so it shouldn't matter if it has changed since
                // this action finished.
                recordAction(call, historyEntryId, exchangeId, recorder, sharedModelModifications);
            } else {
                // TODO: This is a new feature that is being added to the tree:
                // any errors that happen during an action will cause the tree to revert back to 
                // how it was before. 
                // This might be a good thing to do, but it needs to be analyzed to see what happens
                // with the shared models when the patches are undone.
                recorder.undo();
            }
        }
    });

    /**
     * This is used both internally to skip recording the undo and redo actions, and
     * to allow code using this middle ware to skip certain actions.
     *
     * The `recordingDisabled` counter is used above in onStart in its recordPatches
     * callback. Note that this is global setting. So if something starts skipping
     * recording that would be applied to all actions even un related asynchronous
     * ones.
     */
    const skipRecording = <T>(fn: () => T): T => {
        recordingDisabled++;
        try {
            return fn();
        } finally {
            recordingDisabled--;
        }
    };

    // I'd guess in our case we always want to include hooks. If a model makes some 
    // changes to its state when it is added to the tree during an action we'd want that
    // to be part of the undo stack.  
    //
    // TODO: however perhaps this setting is just for the initial action. So perhaps even
    // without this the creation of a model would be recorded by the recorder if it was
    // a done in a child action. So we should do some experimentation with middleware
    // the recorder and hooks.
    const middlewareDisposer = addMiddleware(tree, treeMonitorMiddleware, includeHooks);

    // We might need an option to not add this disposer, but it seems it would generally
    // ge a good thing to do.
    addDisposer(tree, middlewareDisposer);

    const getActionName = (call: IActionTrackingMiddleware2Call<CallEnv>) => {
        return `${getPath(call.context)}/${call.name}`;
    };

    const recordAction = async (call: IActionTrackingMiddleware2Call<CallEnv>, 
        historyEntryId: string, exchangeId: string,
        recorder: IPatchRecorder, sharedModelModifications: SharedModelModifications) => {    
            if (!isActionFromManager(call)) {
                // We record the start of the action even if it doesn't have any
                // patches. This is useful when an action only modifies the shared
                // tree
                //
                // We only record this when the action is not triggered by the
                // manager. If the manager triggered the action then it is up to
                // the manager to setup this information first.
                await manager.addHistoryEntry(historyEntryId, exchangeId, tree.treeId, getActionName(call), true);
            }
    
            // Call the shared model notification function if there are changes. 
            // This is needed so the changes can be sent to the manager,
            // and so the changes can trigger a update/sync of the tile model
            // Previously this internal updating or sync'ing was done using an autorun to monitor the models. 
            // But that doesn't have access to the action id that triggered the sync, and that action id is
            // needed so we can group the changes together so we can undo them
            // later.
            //
            // TODO: If there are multiple shared model changes, we might want
            // to send them all to the tree at the same time, that way
            // it can inform the tiles of all changes at the same time.
            for (const [sharedModelPath, numModifications] of Object.entries(sharedModelModifications)) {
                if (numModifications > 0) {
                    // Run the callbacks tracking changes to the shared model We
                    // need to wait for these to complete because the manager
                    // needs to know when this history entry is complete. If it
                    // gets the addTreePatchRecord before any changes from the
                    // shared models it will mark the entry complete too soon.
                    //
                    // handleSharedModelChanges is an action on the tree, that
                    // we are calling from a middleware that is monitoring that
                    // tree. And at this point we are finishing a different
                    // action. Currently doing this starts a new top level
                    // action: an action with no parent actions. This is what we
                    // want so we can record any changes made to the tree as
                    // part of the undo entry. I don't know if calling an action
                    // from a middleware is an officially supported or tested
                    // approach. It is working now. In the future it might be
                    // necessary to delay this with a setTimeout. 
                    //
                    // Without the setTimeout this ends up being basically
                    // recursive. We will end up back in this recordAction
                    // function. Because we are awaiting
                    // handleSharedModelChanges that second recursive
                    // recordAction will get kicked off before this call to
                    // handleSharedModelChanges returns. onFinish does not await
                    // recordAction, so after the second recordAction is called,
                    // this first call can continue. 
                    //
                    // A new exchangeId needs to be created here because this
                    // handleSharedModelChanges is treated the same as a call
                    // from the TreeManager in these cases the middleware
                    // expects the exchange to have already been started.
                    // handleSharedModelChanges needs to be treated this way so
                    // the same historyEntryId is used by the middleware. This
                    // way any changes triggered by the shared model update are
                    // recorded in the same HistoryEntry
                    //
                    // This should always result in a addTreePatchRecord being
                    // called even if there are no changes.
                    // This is because it is a top level action, so just a few 
                    // lines down, in the recursive call it will call 
                    // addTreePatchRecord
                    const sharedModelChangesExchangeId = nanoid();
                    await manager.startExchange(historyEntryId, sharedModelChangesExchangeId, 
                        "recordAction.sharedModelChanges");
                    await tree.handleSharedModelChanges(historyEntryId, sharedModelChangesExchangeId, 
                        call, sharedModelPath);
                }
            }

            // The tree might have been destroyed in the meantime. This happens during tests.
            // In that case we bail and don't record anything
            if (!isAlive(tree)) {
                return;
            }

            // TODO: CLUE Specific filtering of 'changeCount', should we record
            // this or not?
            const filterChangeCount = (patch: IJsonPatch) => !patch.path.match(/\/changeCount/);
            const patches = recorder.patches.filter(filterChangeCount);
            const inversePatches = recorder.inversePatches.filter(filterChangeCount);

            // Always send the record to the manager even if there are no
            // patches. This API is how the manager knows the exchangeId is finished. 
            const record: TreePatchRecordSnapshot = {
                tree: tree.treeId,
                action: getActionName(call),
                patches,
                inversePatches,
            };
            manager.addTreePatchRecord(historyEntryId, exchangeId, record);
        };

    return {
        middlewareDisposer,

        withoutUndo<T>(fn: () => T): T {
            return skipRecording(fn);
        },
        withoutUndoFlow(generatorFn: () => any) {
            return flow(function* __withoutUndoFlow__() {
                recordingDisabled++;
                try {
                    return yield* generatorFn();
                } finally {
                    recordingDisabled--;
                }
            });
        },
    };
};

function isActionFromManager(call: IActionTrackingMiddleware2Call<CallEnv>) {
    return (
        // Because we haven't implemented applySharedModelSnapshotFromManager yet
        // All calls to handleSharedModelChanges are actually internal calls
        // However we treat it the same because we want any changes triggered
        // by a shared model update added to the same history entry
        call.name === "handleSharedModelChanges" ||
        call.name === "applyPatchesFromManager" ||
        call.name === "startApplyingPatchesFromManager" ||
        call.name === "finishApplyingPatchesFromManager" ||
        // We haven't implemented this yet, it is needed to support two trees
        // working with the same shared model
        call.name === "applySharedModelSnapshotFromManager"
    );
}
