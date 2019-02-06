import Canvas from '../support/elements/Canvas'
import LeftNav from '../support/elements/LeftNav'
import TableToolTile from '../support/elements/TableToolTile'


let canvas = new Canvas,
    leftNav = new LeftNav,
    tableToolTile = new TableToolTile;

context('Table Tool Tile',function(){
   describe('test menu functions of table', function(){
      it('will add a table to canvas', function(){
          leftNav.openToWorkspace('Introduction');
          canvas.addTableTile();
          tableToolTile.getTableToolTile().should('be.visible');
      });
      it('will add a row to the table', function(){
          tableToolTile.addNewRow();
          tableToolTile.getTableRow().should('have.length',2);
      });
      it('will change column x name', function(){
          let header = 'pluto';
          tableToolTile.renameColumn('x', header);
          tableToolTile.getColumnHeaderText().first().should('contain',header);
      });
      it('will change column y name', function(){
          let header = 'mars';
          tableToolTile.renameColumn('y', header);
          tableToolTile.getColumnHeaderText().eq(1).should('contain',header);
      });
      it('will cancel a change in column name', function(){
          tableToolTile.getColumnHeaderText().first()
              .then(($header)=>{
                  const text=$header.text();
                  tableToolTile.openRenameColumnDialog(text);
                  tableToolTile.getRenameColumnDialogButton('Cancel').click();
                  cy.log(text);
                  tableToolTile.getColumnHeaderText().first().should('contain',text);
              });
      });
      it('will remove a row', function(){
          tableToolTile.removeRows("0");
          tableToolTile.getTableRow().should('have.length',1);
      })
   });

   describe('edit table entries', function(){
       it('will add content to table', function(){
           //also verify that new row is added when row "enter" key is sent to the last row
       })
   });

    describe('table in different views', function(){
        it('will open 4-up view', function(){

        });
        it('will open in 2-up view', function(){

        });
    });
   describe('share table', function(){

   });
   describe('publish table', function(){

   });
   describe('table in learning logs', function(){

   });
   describe('save and restores table from different areas', function(){
       it('will restore from My Work tab', function(){

       });
       it('will restore from Class Work tab', function(){

       });
       it('will restore from Class Logs tab', function(){

       });
   })
});