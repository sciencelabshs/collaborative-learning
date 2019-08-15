import LeftNav from '../../support/elements/LeftNav'
import Canvas from '../../support/elements/Canvas'
import ImageToolTile from '../../support/elements/ImageToolTile'

const leftNav = new LeftNav;
const canvas = new Canvas;
const imageToolTile = new ImageToolTile;
const baseUrl = `${Cypress.config("baseUrl")}`;


context('Test image functionalities', function(){
    describe('upload image', function(){
        // TODO: Write test.
        it.skip('click on upload file button with text field empty', function(){
           
        });
        it('will load an png from a URL', function(){
            const imageFileURL = 'https://codap.concord.org/~eireland/image.png';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            imageToolTile.getImageURLTextField().last().click().type(imageFileURL);
            cy.get(imageToolTile.imageChooseFileButton()).last().click();
            imageToolTile.getImageToolImage().last().should('have.css', 'background-image','url("'+imageFileURL+'")');
        });
        it('will upload png file from user computer', function(){
            const imageFilePath='image.png';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            // cy.get(imageToolTile.imageChooseFileButton()).first().click();
            cy.uploadFile(imageToolTile.imageChooseFileButton(), imageFilePath, 'image/png')
            cy.wait(2000)
        })
        it('will load an jpg from a URL', function(){
            const imageFileURL = 'https://codap.concord.org/~eireland/case_image.jpg';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            imageToolTile.getImageURLTextField().last().click().type(imageFileURL);
            cy.get(imageToolTile.imageChooseFileButton()).last().click();
            cy.wait(1000);
            imageToolTile.getImageToolImage().last().should('have.css', 'background-image','url("'+imageFileURL+'")');
        });
        it('will upload jpg file from user computer', function(){
            const imageFilePath='case_image.jpg';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            // cy.get(imageToolTile.imageChooseFileButton()).first().click();
            cy.uploadFile(imageToolTile.imageChooseFileButton(), imageFilePath, 'image/jpg');
            cy.wait(2000)
        })
        it('will load an gif from a URL', function(){
            const imageFileURL = 'https://codap.concord.org/~eireland/model_image.gif';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            imageToolTile.getImageURLTextField().last().click().type(imageFileURL);
            cy.get(imageToolTile.imageChooseFileButton()).last().click();
            cy.wait(1000);
            imageToolTile.getImageToolImage().last().should('have.css', 'background-image','url("'+imageFileURL+'")');
        });
        it('will upload gif file from user computer', function(){
            const imageFilePath='model_image.gif';
            canvas.addImageTile();
            imageToolTile.getImageToolControl().last().click();
            // cy.get(imageToolTile.imageChooseFileButton()).first().click();
            cy.uploadFile(imageToolTile.imageChooseFileButton(), imageFilePath, 'image/gif')
            cy.wait(2000)
        })
    });
    describe.skip('restore of images', function(){
        // TODO: Returned a length of 6 instead of 3
        it('will verify all three images that were added by URL in above test are in the tab when re-opened', function(){
            const imageFileURL = ['https://codap.concord.org/~eireland/image.png', 'https://codap.concord.org/~eireland/case_image.jpg', 'https://codap.concord.org/~eireland/model_image.gif'];
            imageToolTile.getImageToolImage().each(($images, index, $list)=>{
                expect($list).to.have.length(3);
                expect($images).to.have.css('background-image').and.contains(imageFileURL[index]);
            });

        });
        // TODO: Returned a length of 6 instead of 3
        it('will verify all three images that were added by upload in above test are in the tab when re-opened', function(){
            const imageFilePath=['image.png','case_image.jpg','model_image.gif'];
            imageToolTile.getImageToolImage().each(($images, index, $list)=>{
                expect($list).to.have.length(3);
                expect($images).to.have.css('background-image').and.contains('url("blob:'+baseUrl);
            })
        })
    });
    describe('transfer of image from left-nav to canvas', function() {
        it.skip('verify cannot drag image when no canvas is present', function(){
        //TODO: Need drag and drop

        //     cy.get('#leftNavTab0').click();
        //     cy.get('.left-nav.expanded > div.expanded-area.expanded > .left-nav-panel > .section > .canvas > .document-content > .tool-tile > .image-tool > img').trigger('mousedown').trigger('mousemove',{pageX: 660 }, {pageY: 475}).trigger('mouseup',{force:true});
        });

        it.skip('verify image can be dragged on to canvas', function(){
            //TODO: Need drag and drop
            // leftNav.openLeftNavTab('Introduction');
            // cy.get('.left-nav.expanded > div.expanded-area.expanded > .left-nav-panel > .section > .canvas > .document-content > .tile-row > .tool-tile > .image-tool > .image-tool-image').first()
            //     // .trigger('mousedown',{which:1})
            //     .trigger('dragstart')
            //     .trigger('drag',670,275, {force:true})
            //     .trigger('mousemove',670, 275, {force:true})
            //     // .trigger('dragend')
            //     .trigger('mouseup',{force:true});
            // leftNav.closeLeftNavTab('Introduction'); //close tab
        });
        it.skip('verify image can be dragged on to different titled canvas', function(){
            //TODO: Need drag and drop
            // leftnav.openLeftNavTab('Introduction').click();
            // cy.get('.left-nav.expanded > div.expanded-area.expanded > .left-nav-panel > .section > .canvas > .document-content > .tile-row > .tool-tile > .image-tool > .image-tool-image').first()
            //     .trigger('mousedown')
            //     .trigger('mousemove',{pageX: 660, pageY: 475})
            //     .trigger('mouseup',{force:true});
            // leftNav.closeLeftNavTab('Introduction'); //close tab
        });
    });
});
