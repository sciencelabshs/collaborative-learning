import ChatPanel from "../../../../support/elements/clue/ChatPanel";
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

const portalUrl = "https://learn.staging.concord.org";
const offeringId1 = "2000";
const offeringId2 = "2004";
const reportUrl1 = "https://learn.staging.concord.org/portal/offerings/" + offeringId1 + "/external_report/49";
const reportUrl2 = "https://learn.staging.concord.org/portal/offerings/" + offeringId2 + "/external_report/49";
const clueTeacher1 = {
  username: "TejalTeacher1",
  password: "ccpassword"
};
const clueTeacher2 = {
  username: "TejalTeacher2",
  password: "ccpassword"
};

describe('Teachers can communicate back and forth in chat panel', () => {
  // TODO: Re-instate the skipped tests below once learn.staging.concord.org is fully functional again
  it.skip("login teacher1 and setup clue chat", () => {
    chatPanel.openTeacherChat(portalUrl, clueTeacher1, reportUrl1);
    cy.openTopTab("problems");
    cy.openProblemSection("Introduction");
  });
  it.skip("verify teacher1 can post document and tile comments", () => {
    // Teacher 1 document comment
    chatPanel.verifyProblemCommentClass();
    cy.wait(1000);
    chatPanel.addCommentAndVerify("This is a teacher1 document comment");
    // Teacher 1 tile comment
    cy.clickProblemResourceTile('introduction');
    chatPanel.addCommentAndVerify("This is a teacher1 tile comment");
  });
  it.skip("login teacher2 and setup clue chat", () => {
    chatPanel.openTeacherChat(portalUrl, clueTeacher2, reportUrl2);
    cy.openTopTab("problems");
    cy.openProblemSection("Introduction");
  });
  it.skip("verify teacher2 can view teacher1's comments and add more comments", () => {
    // Teacher 2 document comment
    chatPanel.verifyProblemCommentClass();
    chatPanel.verifyCommentThreadContains("This is a teacher1 document comment");
    chatPanel.addCommentAndVerify("This is a teacher2 document comment");
    // Teacher 2 tile comment
    cy.clickProblemResourceTile('introduction');
    chatPanel.verifyCommentThreadContains("This is a teacher1 tile comment");
    chatPanel.addCommentAndVerify("This is a teacher2 tile comment");
  });
  it.skip("verify reopening teacher1's clue chat in the same network", () => {
    chatPanel.openTeacherChat(portalUrl, clueTeacher1, reportUrl1);
    cy.openTopTab("problems");
    cy.openProblemSection("Introduction");
  });
  it.skip("verify teacher1 can view teacher2's comments", () => {
    // Teacher 1 document comment
    chatPanel.verifyProblemCommentClass();
    chatPanel.verifyCommentThreadContains("This is a teacher2 document comment");
    // Teacher 1 tile comment
    cy.clickProblemResourceTile('introduction');
    chatPanel.verifyCommentThreadContains("This is a teacher2 tile comment");
  });
});
