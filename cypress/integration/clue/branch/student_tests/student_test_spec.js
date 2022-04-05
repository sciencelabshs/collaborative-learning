import Header from '../../../../support/elements/common/Header';
import ClueHeader from '../../../../support/elements/clue/cHeader';


const header = new Header;
const clueHeader = new ClueHeader;

let student = '5',
    classroom = '5',
    group = '5';

describe('Check header area for correctness', function(){
    before(function(){
        const queryParams = `${Cypress.config("queryParams")}`;

        cy.clearQAData('all');
        cy.visit(queryParams);
        cy.waitForLoad();
    });

    it('will verify if class name is correct', function(){
        header.getClassName().should('contain','Class '+classroom);
    });
    it('will verify if group name is present', function(){
        clueHeader.getGroupName().should('contain','Group '+ group);
    });
    it('will verify group members is correct', function(){
        clueHeader.getGroupMembers().should('contain','S'+student);
    });
    it('will verify student name is correct', function(){
        header.getUserName().should('contain','Student '+student);
    });

});

