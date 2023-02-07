import { useEmulators } from "@firebase/rules-unit-testing";
import { AuthData } from "firebase-functions/lib/common/providers/https";
import { DeepPartial } from "utility-types";
import { IRowMapEntry, ITileMapEntry, IUserContext } from "../src/shared";

export const kEmulatorHost = "127.0.0.1";
export const kPortal = "test.portal";
export const kClaimPortal = "https://test.portal";
export const kCanonicalPortal = "test_portal";
export const kOtherPortal = "other.test.portal";
export const kOtherClaimPortal = "https://other.test.portal";
export const kOtherCanonicalPortal = "other_test_portal";
export const kDemoName = "demo-name";
export const kOtherDemoName = "demo-name";
export const kPlatformUserId = 123456;
export const kUserId = `${kPlatformUserId}`;
export const kFirebaseUserId = `fb-${kUserId}`;
export const kOtherPlatformUserId = 654321;
export const kOtherUserId = `${kOtherPlatformUserId}`;
export const kOtherFirebaseUserId = `fb-${kOtherUserId}`;
export const kClassHash = "class-hash";
export const kOtherClassHash = "other-class-hash";
export const kOffering1Id = "1001";
export const kOffering2Id = "1002";
export const kTeacherName = "Jane Teacher";
export const kOtherTeacherName = "John Teacher";
export const kTeacherNetwork = "teacher-network";
export const kOtherTeacherNetwork = "other-network";
export const kStudentName = "Mary Student";
export const kDocumentType = "problem";
export const kDocumentKey = "document-key";
export const kProblemPath = "abc/1/2";
export const kCurriculumKey = `${kProblemPath}/intro`;
export const kCreatedAt = Date.now();

export const configEmulators = () => {
  useEmulators({
    database: { host: kEmulatorHost, port: 9000 },
    firestore: { host: kEmulatorHost, port: 8088 }
  });
}

export const specUserContext = (overrides?: Partial<IUserContext>, exclude?: string[]): IUserContext => {
  // default to authed mode unless another mode specified
  const appMode = overrides?.appMode || "authed";
  const demoName = overrides?.appMode === "demo" ? overrides?.demoName || kDemoName : undefined;
  const portal = overrides?.portal || kPortal;
  const classHash = overrides?.classHash || kClassHash;
  const context: IUserContext = {
    appMode,
    demoName,
    portal,
    uid: kUserId,
    type: "teacher",
    name: kTeacherName,
    network: kTeacherNetwork,
    classHash,
    teachers: [kUserId],
    // include argument overrides defaults
    ...overrides
  };
  // exclude specified properties from result
  exclude?.forEach(prop => {
    delete (context as any)[prop];
  });
  return context;
};

export const specStudentContext = (overrides?: Partial<IUserContext>, exclude?: string[]): IUserContext => {
  // default to authed mode unless another mode specified
  const appMode = overrides?.appMode || "authed";
  const demoName = overrides?.appMode === "demo" ? overrides?.demoName || kDemoName : undefined;
  const portal = overrides?.portal || kPortal;
  const classHash = overrides?.classHash || kClassHash;
  const context: IUserContext = {
    appMode,
    demoName,
    portal,
    uid: kUserId,
    type: "student",
    name: kStudentName,
    classHash,
    // include argument overrides defaults
    ...overrides
  };
  // exclude specified properties from result
  exclude?.forEach(prop => {
    delete (context as any)[prop];
  });
  return context;
};

export const specAuth = (overrides?: DeepPartial<AuthData>, exclude?: string[]): AuthData => {
  const portal = overrides?.token?.platform_id || kPortal;
  const userId = overrides?.token?.platform_user_id || kPlatformUserId;
  const classHash = overrides?.token?.class_hash || kClassHash;
  const userType = overrides?.token?.user_type === "teacher" ? overrides.token.user_type : "learner";
  const offeringId = userType === "teacher" ? undefined : overrides?.token?.offering_id || kOffering1Id;
  return {
    uid: overrides?.uid || kFirebaseUserId,
    token: {
      user_id: `${portal}/${userId}`,
      class_hash: classHash,
      platform_id: portal,
      platform_user_id: userId,
      user_type: userType,
      offeringId
    } as any
  };
};

export function specDocumentContent(tiles: Array<{ type: string, changes: Object[] }> = []) {
  const rowMap: Record<string, IRowMapEntry> = {};
  const rowOrder: string[] = [];
  const tileMap: Record<string, ITileMapEntry> = {};
  tiles.forEach((tile, i) => {
    // single tile per row for simplicity
    const tileId = `tile-${i}`
    const tileChanges = tile.changes.map(change => JSON.stringify(change));
    const tileContent = { type: tile.type, changes: tileChanges };
    const row: IRowMapEntry = { id: `row-${i}`, tiles: [{ tileId }]};
    rowMap[row.id] = row;
    rowOrder.push(row.id);
    tileMap[tileId] = { id: tileId, content: tileContent };
  });
  return JSON.stringify({ rowMap, rowOrder, tileMap });
}
