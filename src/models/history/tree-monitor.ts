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

            // We are looking for specific actions which we know include a
            // historyEntryId and exchangeId as their first two arguments. This
            // is so we can link all of the changes with this same
            // historyEntryId and exchangeId. These actions are all defined on
            // the common `Tree` model which is composed into the actual root of
            // the MST tree. So individual trees should not be defining these
            // actions themselves.
            //
            // TODO: We might be able use the `decorate` feature of MST to make
            // it more clear in the Tile model that these actions are special. 
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
                    // these modifications so it can tell the tiles to update
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
                    //   /content/sharedModelMap/${sharedModelId}
                    // We a new tile is referencing a shared model the path will be:
                    //   /content/sharedModelMap/${sharedModelId}/tiles/[index]
                    //
                    // When a new shared model is added via addTileSharedModel the
                    // shared model manager will call updateAfterSharedModelChanges after it
                    // adds model to the document and tile to the entry. So there currently
                    // isn't a need for the tree monitor to handle that case.
                    const pathMatch = _patch.path.match(/(.*\/content\/sharedModelMap\/[^/]+\/sharedModel)\//);
                    if(pathMatch) {
                        const sharedModelPath = pathMatch[1];

                        if (!sharedModelModifications[sharedModelPath]) {
                            sharedModelModifications[sharedModelPath] = 1;
                        } else {
                            // increment the number of modifications made to the shared model
                            sharedModelModifications[sharedModelPath]++;
                        }

                        // If this is a shared model view, we shouldn't record the
                        // patch, so we should return false.
                        // 
                        // Currently CLUE doesn't support shared model views, so this isn't
                        // implemented yet.
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
                // recordAction is async
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

    // recordAction is async because it needs to wait for the manager to
    // respond, to the addHistoryEntry, startExchange, and
    // handleSharedModelChanges calls before it can call addTreePatchRecord. The
    // recorded changes are safe because each action creates a new recorder, and
    // the recorder stores the changes. So even if another action is triggered
    // before the changes are sent it will be OK. 
    //
    // If a shared model has been modified, the state of the shared model is
    // captured just before it is sent so the shared model might have been
    // modified after recordAction was was called. This is OK because this
    // shared model state sending is just to synchronize other views of the
    // shared model in other trees. The actual changes to the shared model are 
    // stored in the recorder.
    const recordAction = async (call: IActionTrackingMiddleware2Call<CallEnv>, 
        historyEntryId: string, exchangeId: string,
        recorder: IPatchRecorder, sharedModelModifications: SharedModelModifications) => {    
            if (!isActionFromManager(call)) {
                // We record the start of the action even if it doesn't have any
                // patches. This is useful when an action only modifies the shared
                // tree
                //
                // If the manager triggered the action then the manager already 
                // added the history entry.
                await manager.addHistoryEntry(historyEntryId, exchangeId, tree.treeId, getActionName(call), true);
            }
    
            // Call the shared model notification function if there are changes.
            // This is needed so the changes can be sent to the manager, and so
            // the changes can trigger a update/sync of the tile model.
            //
            // TODO: If there are multiple shared model changes, we might want
            // to send them all to the tree at the same time, that way it can
            // inform the tiles of all changes at the same time.
            for (const [sharedModelPath, numModifications] of Object.entries(sharedModelModifications)) {
                if (numModifications > 0) {
                    // Run the callbacks tracking changes to the shared model.
                    // We need to wait for these to complete because the manager
                    // needs to know when this history entry is complete. If it
                    // gets the addTreePatchRecord before any changes from the
                    // shared models it will mark the entry complete too soon.
                    //
                    // A new exchangeId needs to be created and startExchange
                    // needs to be called because handleSharedModelChanges is
                    // treated the same as a call from the TreeManager. As
                    // described above the middleware expects the exchange to
                    // have already been started. handleSharedModelChanges needs
                    // to be treated this way so the same historyEntryId is used
                    // by the middleware. This way any changes triggered by the
                    // shared model update are recorded in the same HistoryEntry
                    //
                    const sharedModelChangesExchangeId = nanoid();
                    await manager.startExchange(historyEntryId, sharedModelChangesExchangeId, 
                        "recordAction.sharedModelChanges");

                    // Recursion: handleSharedModelChanges is an action on the
                    // tree, and we are currently in a middleware that is
                    // monitoring actions on that tree. At this point in the
                    // middleware we are finishing a different action. Calling
                    // handleSharedModelChanges starts a new top level action:
                    // an action with no parent actions. This is what we want so
                    // we can record any changes made to the tree as part of the
                    // undo entry. I don't know if calling an action from a
                    // middleware is an officially supported or tested approach.
                    // It is working now. If it stops working we could delay the
                    // call to handleSharedModelChanges with a setTimeout.
                    //
                    // It is recursive because we will end up back in this
                    // recordAction function. Because we are awaiting
                    // handleSharedModelChanges that second recursive
                    // recordAction will get kicked off before this call to
                    // handleSharedModelChanges returns. The tree's
                    // implementation of handleSharedModelChanges should not
                    // modify the shared model itself or we could get into an
                    // infinite loop. 
                    //
                    // Within this recursive call to recordAction,
                    // addTreePatchRecord will be called. This is how the
                    // startExchange above is closed out.
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
        // Because we haven't implemented applySharedModelSnapshotFromManager
        // yet, all calls to handleSharedModelChanges are actually internal
        // calls. However we treat those calls as actions from the manager
        // because we want any changes triggered by a shared model update added
        // to the same history entry.
        call.name === "handleSharedModelChanges" ||
        call.name === "applyPatchesFromManager" ||
        call.name === "startApplyingPatchesFromManager" ||
        call.name === "finishApplyingPatchesFromManager" ||
        // We haven't implemented this yet, it is needed to support two trees
        // working with the same shared model
        call.name === "applySharedModelSnapshotFromManager"
    );
}