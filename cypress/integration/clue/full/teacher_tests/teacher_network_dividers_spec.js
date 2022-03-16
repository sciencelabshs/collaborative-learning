import ChatPanel from "../../../../support/elements/clue/ChatPanel";
import TeacherNetwork from "../../../../support/elements/clue/TeacherNetwork";
/**
 * Notes:
 *
 * Teacher dashboard test needs static data from 'clueteachertest's class 'CLUE'
 * Here is the ID for the class in firebase: a1f7b8f8b7b1ad1d2d6240c41bd2354d8575ee09ae8bd641
 *
 * Currently issues with problem switcher/class switcher. Maybe split these into two tests. Have this test
 * log into portal with data that doesn't need to be static.
 *
 * -> This may also help with issue when verifying read-only student canvases which is currently looping through
 *    all of the students in the dashboard's current view
 */

let chatPanel = new ChatPanel;
let teacherNetwork = new TeacherNetwork;

const portalUrl = "https://learn.staging.concord.org";
const offeringId1 = "2000";
const offeringId2 = "2004";
const reportUrl1 = "https://learn.staging.concord.org/portal/offerings/" + offeringId1 + "/external_report/49";
const reportUrl2 = "https://learn.staging.concord.org/portal/offerings/" + offeringId2 + "/external_report/49";
const clueTeacher1 = {
  username: "TejalTeacher1",
  password: "ccpassword",
  firstname: "Tejal",
  lastname: "Teacher1"
};
const clueTeacher2 = {
  username: "TejalTeacher2",
  password: "ccpassword",
  firstname: "Tejal",
  lastname: "Teacher2"
};
const classInfo1 = clueTeacher1.firstname + ' ' + clueTeacher1.lastname + ' / CLUE Testing3';
const workDoc = 'MSA 1.4 Walkathon Money';
const classInfo2 = clueTeacher2.firstname + ' ' + clueTeacher2.lastname + ' / CLUE Testing Class 2';
const planningDoc = 'MSA 1.4 Walkathon Money: Planning';

describe('Teachers can see network dividers', () => {
  it('verify network dividers in My Work tab for teacher in network', () => {
    chatPanel.openTeacherChat(portalUrl, clueTeacher1, reportUrl1);
    cy.openTopTab("my-work");
    cy.openSection('my-work', 'workspaces');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-classes');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-network');

    cy.openSection('my-work', 'starred');
    teacherNetwork.verifyDividerLabel('starred', 'my-classes');
    teacherNetwork.verifyDividerLabel('starred', 'my-network');

    cy.openSection('my-work', 'learning-log');
    teacherNetwork.verifyDividerLabel('learning-log', 'my-classes');
    teacherNetwork.verifyDividerLabel('learning-log', 'my-network');
  });

  it('verify network dividers in Class Work tab for teacher in network', () => {
    cy.openTopTab("class-work");
    cy.openSection('class-work', 'workspaces');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-classes');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-network');

    cy.openSection('class-work', 'workspaces');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-classes');
    teacherNetwork.verifyDividerLabel('workspaces', 'my-network');

    cy.openSection('class-work', 'learning-logs');
    teacherNetwork.verifyDividerLabel('learning-logs', 'my-classes');
    teacherNetwork.verifyDividerLabel('learning-logs', 'my-network');

    cy.openSection('class-work', 'starred');
    teacherNetwork.verifyDividerLabel('starred', 'my-classes');
    teacherNetwork.verifyDividerLabel('starred', 'my-network');
  });
});
