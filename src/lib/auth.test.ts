import { authenticate,
        createFakeAuthentication,
        DEV_STUDENT,
        PORTAL_JWT_URL_SUFFIX,
        FIREBASE_JWT_URL_SUFFIX,
        FIREBASE_JWT_QUERY,
        getAppMode,
        createFakeUser,
        getFirebaseJWTParams,
        generateDevAuthentication} from "./auth";
import { IPortalClassInfo, IPortalClassUser, PortalStudentJWT, PortalTeacherJWT } from "./portal-types";
import nock from "nock";
import { NUM_FAKE_STUDENTS, NUM_FAKE_TEACHERS } from "../components/demo/demo-creator";
import { specAppConfig } from "../models/stores/spec-app-config";
import * as UrlParams from "../utilities/url-params";
type QueryParams = UrlParams.QueryParams;

/* eslint-disable max-len */
const RAW_STUDENT_PORTAL_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiIsImlhdCI6MTUzODA1NTg5MCwiZXhwIjoxNTM4MDU5NDkwLCJ1aWQiOjQ1NDMsImRvbWFpbiI6Imh0dHBzOi8vbGVhcm4uc3RhZ2luZy5jb25jb3JkLm9yZy8iLCJ1c2VyX3R5cGUiOiJsZWFybmVyIiwidXNlcl9pZCI6Imh0dHBzOi8vbGVhcm4uc3RhZ2luZy5jb25jb3JkLm9yZy91c2Vycy80NTQzIiwibGVhcm5lcl9pZCI6MTIzMiwiY2xhc3NfaW5mb191cmwiOiJodHRwczovL2xlYXJuLnN0YWdpbmcuY29uY29yZC5vcmcvYXBpL3YxL2NsYXNzZXMvNjYiLCJvZmZlcmluZ19pZCI6MTAzM30.WxfzUkv7mWBv3fN_I3eYKp7VxBNADLLhIurxXjewoK4";
const RAW_STUDENT_FIREBASE_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhbGciOiJSUzI1NiIsImlzcyI6ImZpcmViYXNlLWFkbWluc2RrLWF4a2JsQGNvbGxhYm9yYXRpdmUtbGVhcm5pbmctZWMyMTUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJmaXJlYmFzZS1hZG1pbnNkay1heGtibEBjb2xsYWJvcmF0aXZlLWxlYXJuaW5nLWVjMjE1LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiYXVkIjoiaHR0cHM6Ly9pZGVudGl0eXRvb2xraXQuZ29vZ2xlYXBpcy5jb20vZ29vZ2xlLmlkZW50aXR5LmlkZW50aXR5dG9vbGtpdC52MS5JZGVudGl0eVRvb2xraXQiLCJpYXQiOjE1MzgwNTU4OTAsImV4cCI6MTUzODA1OTQ5MCwidWlkIjoiYTU2ZjBlMmUxNzZhYTQ4ZWFhMzRmMTllMDkyMmViZTgiLCJkb21haW4iOiJodHRwczovL2xlYXJuLnN0YWdpbmcuY29uY29yZC5vcmcvIiwiZXh0ZXJuYWxJZCI6MTIzMiwicmV0dXJuVXJsIjoiaHR0cHM6Ly9sZWFybi5zdGFnaW5nLmNvbmNvcmQub3JnL2RhdGFzZXJ2aWNlL2V4dGVybmFsX2FjdGl2aXR5X2RhdGEvYTNmN2Y4ZDQtMjY4ZS00ODQzLThmMzEtZmM0YWRlN2Q3ODAxIiwibG9nZ2luZyI6ZmFsc2UsImRvbWFpbl91aWQiOjQ1NDMsImNsYXNzX2luZm9fdXJsIjoiaHR0cHM6Ly9sZWFybi5zdGFnaW5nLmNvbmNvcmQub3JnL2FwaS92MS9jbGFzc2VzLzY2IiwiY2xhaW1zIjp7InVzZXJfdHlwZSI6ImxlYXJuZXIiLCJ1c2VyX2lkIjoiaHR0cHM6Ly9sZWFybi5zdGFnaW5nLmNvbmNvcmQub3JnL3VzZXJzLzQ1NDMiLCJjbGFzc19oYXNoIjoiODRkZGIxOTcxZTE2Yjc1NmQ1ZmRlOTdhNzk3OTU4Y2FlYWU4ZjcxMzM4ZDMyZmRjIiwib2ZmZXJpbmdfaWQiOjEwMzN9fQ.lvjuLdrAfbQizwilvv9zCi4cwAmmcrLfKZcnX5-R3O6n_-hSfuAVZ_ScK_95mkFkZdx9Mdpx1j4bDAYEc9gpwP7mIjFqlDJFuwG6m1gicj-D-DrIvecf5nJhCVJgzcEYyuCwLdDhk8iPEFeaJZRqaCg7m8l2B6qWO2nWWFdUTYCyWcmab-VF8z-A43fD76PBNeOdiz90iNBLK_VIMoRNWsk1BVRW4IPUJYsTh1SDWpUP2ocFzuk7x59XiQszlA1CII4pl5O_thtyK79Spt10MbhGbXFZWa1j60TYH3Pi-mXF-JDjD8UUVKUR24PAr8CMCuFstgdnMwphhiGALRtI2g";

const RAW_TEACHER_PORTAL_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiIsImlhdCI6MTUzODA1NTY2OSwiZXhwIjoxNTM4MDU5MjY5LCJ1aWQiOjIxNywiZG9tYWluIjoiaHR0cHM6Ly9sZWFybi5zdGFnaW5nLmNvbmNvcmQub3JnLyIsInVzZXJfdHlwZSI6InRlYWNoZXIiLCJ1c2VyX2lkIjoiaHR0cHM6Ly9sZWFybi5zdGFnaW5nLmNvbmNvcmQub3JnL3VzZXJzLzIxNyIsInRlYWNoZXJfaWQiOjg4fQ.lwFtD-UUXQOcOono0Q9fjBQFbOdP14rhZbJw9PN51vk";
const RAW_TEACHER_FIREBASE_JWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhbGciOiJSUzI1NiIsImlzcyI6ImZpcmViYXNlLWFkbWluc2RrLWF4a2JsQGNvbGxhYm9yYXRpdmUtbGVhcm5pbmctZWMyMTUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJmaXJlYmFzZS1hZG1pbnNkay1heGtibEBjb2xsYWJvcmF0aXZlLWxlYXJuaW5nLWVjMjE1LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiYXVkIjoiaHR0cHM6Ly9pZGVudGl0eXRvb2xraXQuZ29vZ2xlYXBpcy5jb20vZ29vZ2xlLmlkZW50aXR5LmlkZW50aXR5dG9vbGtpdC52MS5JZGVudGl0eVRvb2xraXQiLCJpYXQiOjE1MzgwNTU2NzAsImV4cCI6MTUzODA1OTI3MCwidWlkIjoiMzU4MTYwYzk3M2Y0MmE0MzYxZjA5YzdlMjA2YjVmNGQiLCJkb21haW4iOiJodHRwczovL2xlYXJuLnN0YWdpbmcuY29uY29yZC5vcmcvIiwiZG9tYWluX3VpZCI6MjE3LCJjbGFpbXMiOnsidXNlcl90eXBlIjoidGVhY2hlciIsInVzZXJfaWQiOiJodHRwczovL2xlYXJuLnN0YWdpbmcuY29uY29yZC5vcmcvdXNlcnMvMjE3IiwiY2xhc3NfaGFzaCI6bnVsbH19.XQ_-MmbZUegnod789tKZgWt4r3QpecEoSASb572jDfQGEKupiWGcXn2MGeESuRsOFwD3eWbiQoC6B7F8cy6h0EiaXhIVFR_xrviqoXgayQsDQalrCVGjllLGak4vY7p-ZnLvSie6F9-KubPIfsF_0NdRSDTFOHbN3LGhpxGUYxc4GKandDgGTJwy5rgXLebU7ezzKyzE2YAYEGuVPge5Yf9PgXI__OsbiUD4tOK2dxSTytcL30maeYQ4x0CBWY96w8oOlusOHIsf96OkqKe272SXz2BgkhF6e1IHby_CIhl51FFxAqKr6P1sPlt8WnVpK7qwTDY8VSNCYNxNQMiaXw";
/* eslint-enable max-len */

const STUDENT_PORTAL_JWT: PortalStudentJWT = {
  alg: "HS256",
  iat: 1538055890,
  exp: 1538059490,
  uid: 4543,
  domain: "https://learn.staging.concord.org/",
  user_type: "learner",
  user_id: "https://learn.staging.concord.org/users/4543",
  learner_id: 1232,
  class_info_url: "https://learn.staging.concord.org/api/v1/classes/66",
  offering_id: 1033,
};

const TEACHER_PORTAL_JWT: PortalTeacherJWT = {
  alg: "HS256",
  iat: 1538055669,
  exp: 1538059269,
  uid: 217,
  domain: "https://learn.staging.concord.org/",
  user_type: "teacher",
  user_id: "https://learn.staging.concord.org/users/217",
  teacher_id: 88,
};

const GOOD_STUDENT_TOKEN = "goodStudentToken";
const BAD_STUDENT_TOKEN = "badStudentToken";

const GOOD_TEACHER_TOKEN = "goodTeacherToken";
const BAD_TEACHER_TOKEN = "badTeacherToken";

const CLASS_HASH = "testHash";

// follow nock conventions: host with no trailing slash, path with leading slash
const BASE_PORTAL_HOST = "https://learn.staging.concord.org";
const BASE_PORTAL_URL = `${BASE_PORTAL_HOST}/`;

const PORTAL_JWT_PATH = `/${PORTAL_JWT_URL_SUFFIX}`;
const FIREBASE_JWT_PATH = `/${FIREBASE_JWT_URL_SUFFIX}`;
const OFFERING_INFO_PATH = "/api/v1/offerings/1033";
const CLASS_INFO_PATH = "/api/v1/classes/66";
const CLASSES_MINE_PATH = "/api/v1/classes/mine";
// const OFFERINGS_PATH = "/api/v1/offerings";

const CLASS_INFO_URL = BASE_PORTAL_HOST + CLASS_INFO_PATH;
const OFFERING_INFO_URL = BASE_PORTAL_HOST + OFFERING_INFO_PATH;

const RAW_CORRECT_STUDENT: IPortalClassUser = {
  id: STUDENT_PORTAL_JWT.user_id,
  user_id: STUDENT_PORTAL_JWT.uid,
  first_name: "GoodFirst",
  last_name: "GoodLast",
};

const RAW_INCORRECT_STUDENT: IPortalClassUser = {
  id: "bad id",
  user_id: 0,
  first_name: "BadFirst",
  last_name: "BadLast",
};

const RAW_CORRECT_TEACHER: IPortalClassUser = {
  id: TEACHER_PORTAL_JWT.user_id,
  user_id: TEACHER_PORTAL_JWT.uid,
  first_name: "GoodFirst",
  last_name: "GoodLast",
};

const RAW_CLASS_INFO: IPortalClassInfo = {
  id: 12345,
  uri: "https://foo.bar",
  name: "test name",
  class_hash: CLASS_HASH,
  students: [RAW_CORRECT_STUDENT, RAW_INCORRECT_STUDENT ],
  teachers: [RAW_CORRECT_TEACHER],
  offerings: []
};

const PARTIAL_RAW_OFFERING_INFO = {
  activity_url: "https://foo.bar/?problem=3.2"
};

describe("dev mode", () => {
  const originalUrlParams = UrlParams.urlParams;

  const setUrlParams = (params: QueryParams) => {
    (UrlParams as any).urlParams = params;
  };

  afterEach(() => {
    setUrlParams(originalUrlParams);
  });

  it("should be in dev mode on a local machine", () => {
    const mode = getAppMode(undefined, undefined, "localhost");
    expect(mode).toBe("dev");
  });

  it("should not be in dev mode if authentication is being tested", () => {
    const mode = getAppMode(undefined, "testToken", "localhost");
    expect(mode).toBe("authed");
  });

  it("should not be in dev mode by default in production", () => {
    const mode = getAppMode(undefined, undefined, "learning.concord.org");
    expect(mode).toBe("authed");
  });

  it("should use the dev mode parameter if it's specified", () => {
    const trueMode = getAppMode("dev", undefined, "learning.concord.org");
    expect(trueMode).toBe("dev");
  });

  it("should generateDevAuthentication for a student by default", () => {
    const { authenticatedUser } = generateDevAuthentication("UNIT", "1.1");
    expect(authenticatedUser.type).toBe("student");
  });

  it("should generateDevAuthentication for a student with a fake id", () => {
    setUrlParams({ fakeUser: "student:2222" });
    const { authenticatedUser } = generateDevAuthentication("UNIT", "1.1");
    expect(authenticatedUser.type).toBe("student");
    expect(authenticatedUser.id).toBe("2222");
  });

  it("should generateDevAuthentication for a teacher with the fakeUser url parameter", () => {
    setUrlParams({ fakeUser: "teacher" });
    const { authenticatedUser } = generateDevAuthentication("UNIT", "1.1");
    expect(authenticatedUser.type).toBe("teacher");
  });

  it("should generateDevAuthentication for a teacher with a network url parameter", () => {
    setUrlParams({ fakeUser: "teacher", network: "network" });
    const { authenticatedUser } = generateDevAuthentication("UNIT", "1.1");
    expect(authenticatedUser.type).toBe("teacher");
  });

  it("should generateDevAuthentication for a teacher with a fake id", () => {
    setUrlParams({ fakeUser: "teacher:2222" });
    const { authenticatedUser } = generateDevAuthentication("UNIT", "1.1");
    expect(authenticatedUser.type).toBe("teacher");
    expect(authenticatedUser.id).toBe("2222");
  });
});

describe("demo mode", () => {
  let urlParams: QueryParams = {
    fakeClass: "1",
    fakeUser: "student:2",
    problem: "3.1",
  };
  let appConfig = specAppConfig();

  beforeEach(() => {
    urlParams = {
      fakeClass: "1",
      fakeUser: "student:2",
      problem: "3.1",
    };
    appConfig = specAppConfig();
  });

  it("should be valid", () => {
    const mode = getAppMode("demo");
    expect(mode).toBe("demo");
  });

  it("should authenticate demo students", (done) => {
    authenticate("demo", appConfig, urlParams).then(({authenticatedUser}) => {
      const demoUser = createFakeUser({
        appMode: "demo",
        classId: "1",
        userType: "student",
        userId: "2",
        offeringId: "301"
      });
      expect(authenticatedUser).toEqual(demoUser);
      done();
    });
  });

  it("should handle preview launch from portal", (done) => {
    urlParams.domain = "preview";
    urlParams.domain_uid = "2222";
    authenticate("demo", appConfig, urlParams).then(({authenticatedUser}) => {
      expect(authenticatedUser.className).toBe("Demo Class preview-2222");
      expect(authenticatedUser.type).toBe("student");
      expect(authenticatedUser.id).toBe("2222");
      done();
    });
  });

  it("should fail without a demo class", (done) => {
    urlParams.fakeClass = undefined;
    authenticate("demo", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("should fail without a demo user", (done) => {
    urlParams.fakeUser = undefined;
    authenticate("demo", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("should fail with an invalid demo user", (done) => {
    urlParams.fakeUser = "invalid";
    authenticate("demo", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

});

describe("student authentication", () => {

  const appConfig = specAppConfig();

  beforeEach(() => {
    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        authorization: `Bearer/JWT ${RAW_STUDENT_PORTAL_JWT}`
      }
    })
    .get(CLASS_INFO_PATH)
    .reply(200, RAW_CLASS_INFO);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("works in dev mode", (done) => {
    authenticate("dev", appConfig).then(({authenticatedUser}) => {
      expect(authenticatedUser).toEqual(DEV_STUDENT);
      done();
    });
  });

  it("works in authed mode", (done) => {
    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        authorization: `Bearer ${GOOD_STUDENT_TOKEN}`
      }
    })
    .get(PORTAL_JWT_PATH)
    .reply(200, {
      token: RAW_STUDENT_PORTAL_JWT,
    });

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        authorization: `Bearer ${GOOD_STUDENT_TOKEN}`
      }
    })
    .get(FIREBASE_JWT_PATH + getFirebaseJWTParams(CLASS_HASH))
    .reply(200, {
      token: RAW_STUDENT_FIREBASE_JWT,
    });

    authenticate("authed", appConfig, {token: GOOD_STUDENT_TOKEN, domain: BASE_PORTAL_URL})
    .then(({authenticatedUser}) => {
      expect(authenticatedUser).toEqual({
        type: "student",
        id: `${STUDENT_PORTAL_JWT.uid}`,
        portal: "learn.staging.concord.org",
        firstName: RAW_CORRECT_STUDENT.first_name,
        lastName: RAW_CORRECT_STUDENT.last_name,
        fullName: `${RAW_CORRECT_STUDENT.first_name} ${RAW_CORRECT_STUDENT.last_name}`,
        initials: "GG",
        className: RAW_CLASS_INFO.name,
        classHash: CLASS_HASH,
        offeringId: "1033",
        portalJWT: {
          alg: "HS256",
          iat: 1538055890,
          exp: 1538059490,
          uid: 4543,
          domain: "https://learn.staging.concord.org/",
          user_type: "learner",
          user_id: "https://learn.staging.concord.org/users/4543",
          learner_id: 1232,
          class_info_url: "https://learn.staging.concord.org/api/v1/classes/66",
          offering_id: 1033,
        },
        firebaseJWT: {
          alg: "RS256",
          iss: "firebase-adminsdk-axkbl@collaborative-learning-ec215.iam.gserviceaccount.com",
          sub: "firebase-adminsdk-axkbl@collaborative-learning-ec215.iam.gserviceaccount.com",
          aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
          iat: 1538055890,
          exp: 1538059490,
          uid: "a56f0e2e176aa48eaa34f19e0922ebe8",
          domain: "https://learn.staging.concord.org/",
          externalId: 1232,
          returnUrl: "https://learn.staging.concord.org/dataservice/external_activity_data/a3f7f8d4-268e-4843-8f31-fc4ade7d7801",
          logging: false,
          domain_uid: 4543,
          class_info_url: "https://learn.staging.concord.org/api/v1/classes/66",
          claims: {
            user_type: "learner",
            user_id: "https://learn.staging.concord.org/users/4543",
            class_hash: "84ddb1971e16b756d5fde97a797958caeae8f71338d32fdc",
            offering_id: 1033
          }
        },
        rawPortalJWT: RAW_STUDENT_PORTAL_JWT,
        rawFirebaseJWT: RAW_STUDENT_FIREBASE_JWT,
        portalClassOfferings: []
      });
      done();
    })
    .catch(done);
  });

  it("fails with a bad token", (done) => {
    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        authorization: `Bearer ${BAD_STUDENT_TOKEN}`
      }
    })
    .get(PORTAL_JWT_PATH)
    .reply(400);

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        authorization: `Bearer ${BAD_STUDENT_TOKEN}`
      }
    })
    .get(FIREBASE_JWT_PATH + FIREBASE_JWT_QUERY)
    .reply(400);

    authenticate("authed", appConfig, {token: BAD_STUDENT_TOKEN, domain: BASE_PORTAL_URL})
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with no token", (done) => {
    authenticate("authed", appConfig, {token: undefined, domain: BASE_PORTAL_URL})
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with no domain", (done) => {
    authenticate("authed", appConfig, {token: BAD_STUDENT_TOKEN, domain: undefined})
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("can create demo students", () => {
    const demoInfo = createFakeAuthentication({
      appMode: "demo",
      classId: "1",
      userType: "student",
      userId: "2",
      unitCode: "",
      problemOrdinal: "3.1"
    });
    expect(demoInfo.authenticatedUser).toEqual({
      type: "student",
      id: "2",
      portal: "demo",
      firstName: "Student",
      lastName: "2",
      fullName: "Student 2",
      initials: "S2",
      className: "Demo Class 1",
      classHash: "democlass1",
      offeringId: "301"
    });
    expect(demoInfo.classInfo.name).toEqual("Demo Class 1");
    expect(demoInfo.classInfo.classHash).toEqual("democlass1");
    expect(demoInfo.classInfo.students.length).toEqual(NUM_FAKE_STUDENTS);
  });

  it("can create demo teachers", () => {
    const demoInfo = createFakeAuthentication({
      appMode: "demo",
      classId: "1",
      userType: "teacher",
      userId: "2",
      network: "demo-network",
      unitCode: "",
      problemOrdinal: "3.1"
    });
    expect(demoInfo.authenticatedUser).toEqual({
      type: "teacher",
      id: "1002",
      portal: "demo",
      firstName: "Teacher",
      lastName: "2",
      fullName: "Teacher 2",
      initials: "T2",
      className: "Demo Class 1",
      classHash: "democlass1",
      network: "demo-network",
      offeringId: "301",
      demoClassHashes: ["democlass1", "democlass2", "democlass3"]
    });
    expect(demoInfo.classInfo.name).toEqual("Demo Class 1");
    expect(demoInfo.classInfo.classHash).toEqual("democlass1");
    expect(demoInfo.classInfo.students.length).toEqual(NUM_FAKE_STUDENTS);
    const demoTeachers = demoInfo.classInfo.teachers;
    expect(demoTeachers.length).toEqual(NUM_FAKE_TEACHERS);
    expect(demoTeachers[0].network).toBeUndefined();
    expect(demoTeachers[1].network).toBe("demo-network");
  });
});

describe("teacher authentication", () => {
  let urlParams: QueryParams = {
    token: GOOD_TEACHER_TOKEN,
    reportType: "offering",
    class: CLASS_INFO_URL,
    offering: OFFERING_INFO_URL
  };
  const appConfig = specAppConfig();

  beforeEach(() => {
    urlParams = {token: GOOD_TEACHER_TOKEN, reportType: "offering", class: CLASS_INFO_URL, offering: OFFERING_INFO_URL};

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer/JWT ${RAW_TEACHER_PORTAL_JWT}`
      }
    })
    .get(CLASS_INFO_PATH)
    .reply(200, RAW_CLASS_INFO);

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer/JWT ${RAW_TEACHER_PORTAL_JWT}`
      }
    })
    .get(OFFERING_INFO_PATH)
    .reply(200, PARTIAL_RAW_OFFERING_INFO);

    nock("https://learn.staging.concord.org/")
    .get(/\/offerings\/\?user_id=.*/)
    .reply(200, []);

  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("works in authed mode", (done) => {
    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer ${GOOD_TEACHER_TOKEN}`
      }
    })
    .get(PORTAL_JWT_PATH)
    .reply(200, {
      token: RAW_TEACHER_PORTAL_JWT,
    });

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer ${GOOD_TEACHER_TOKEN}`
      }
    })
    .get(FIREBASE_JWT_PATH + getFirebaseJWTParams(CLASS_HASH))
    .reply(200, {
      token: RAW_TEACHER_FIREBASE_JWT,
    });

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer ${GOOD_TEACHER_TOKEN}`
      }
    })
    .get(CLASSES_MINE_PATH)
    .reply(200, {classes: []});

    authenticate("authed", appConfig, urlParams).then(({authenticatedUser, problemId}) => {
      expect(authenticatedUser).toEqual({
        type: "teacher",
        id: `${TEACHER_PORTAL_JWT.uid}`,
        portal: "learn.staging.concord.org",
        portalClassOfferings: [],
        firstName: RAW_CORRECT_TEACHER.first_name,
        lastName: RAW_CORRECT_TEACHER.last_name,
        fullName: `${RAW_CORRECT_TEACHER.first_name} ${RAW_CORRECT_TEACHER.last_name}`,
        initials: "GG",
        className: RAW_CLASS_INFO.name,
        classHash: CLASS_HASH,
        offeringId: "1033",
        portalJWT: {
          alg: "HS256",
          iat: 1538055669,
          exp: 1538059269,
          uid: 217,
          domain: "https://learn.staging.concord.org/",
          user_type: "teacher",
          user_id: "https://learn.staging.concord.org/users/217",
          teacher_id: 88,
        },
        firebaseJWT: {
          alg: "RS256",
          iss: "firebase-adminsdk-axkbl@collaborative-learning-ec215.iam.gserviceaccount.com",
          sub: "firebase-adminsdk-axkbl@collaborative-learning-ec215.iam.gserviceaccount.com",
          aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
          iat: 1538055670,
          exp: 1538059270,
          uid: "358160c973f42a4361f09c7e206b5f4d",
          domain: "https://learn.staging.concord.org/",
          domain_uid: 217,
          claims: {
            user_type: "teacher",
            user_id: "https://learn.staging.concord.org/users/217",
            class_hash: null
          }
        },
        rawPortalJWT: RAW_TEACHER_PORTAL_JWT,
        rawFirebaseJWT: RAW_TEACHER_FIREBASE_JWT,
      });
      expect(problemId).toBe("3.2");
      done();
    })
    .catch(done);
  });

  it("fails with a bad token", (done) => {
    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer ${BAD_TEACHER_TOKEN}`
      }
    })
    .get(PORTAL_JWT_PATH)
    .reply(400);

    nock(BASE_PORTAL_HOST, {
      reqheaders: {
        Authorization: `Bearer ${BAD_TEACHER_TOKEN}`
      }
    })
    .get(FIREBASE_JWT_PATH + FIREBASE_JWT_QUERY)
    .reply(400);

    urlParams.token = BAD_TEACHER_TOKEN;
    authenticate("authed", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with no token", (done) => {
    urlParams.token = undefined;
    authenticate("authed", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with a bad report type", (done) => {
    urlParams.reportType = "unknown";
    authenticate("authed", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with no class", (done) => {
    urlParams.class = undefined;
    authenticate("authed", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });

  it("fails with no offering", (done) => {
    urlParams.offering = undefined;
    authenticate("authed", appConfig, urlParams)
      .then(() => {
        done.fail();
      })
      .catch(() => done());
  });
});
