DFMEAs= new Meteor.Collection("dfmeas");
Nodes = new Meteor.Collection("nodes");

// if the database is empty on server start, create some sample data.
Meteor.startup(function () {
  var dfmea_id;
  if (DFMEAs.find().count() === 0) {
    var timestamp = (new Date()).getTime();
    dfmea_id=DFMEAs.insert({
        name: "Test FMEA 1",
        header:[],
        project: null, 
        created: {"userid":timestamp},
        revised: {"userid":timestamp},
        subcategories: []
    }
);
    timestamp += 1; // ensure unique timestamp.
  }

  

//  Nodes contains the tree that makes up all the stuff under the FMEA title.
//  DFMEAs is the list of DFMEAs
//  Nodes data structure 
//    categoryName:  string.   
//                   contains values from the following:
//                    "DesignFunction"
//                    "FailureMode"
//                    "FailureEffect"
//                    "SEV"
//             not implemented yet       "Classification"
//                    "FailureCause"
//                    "OCC"
//                    "DesignControl"
//                    "DET"
//    parentCategory: string
//                    this is the database id for the parent in the tree
//    subcategories:  array of strings
//                    is null if the node is a leaf
//                    otherwise has the ids of the children
//    content:  string containing what is visible on the DFMEA
//    timestamp:      number
//
//  DFMEAS data structure
//    project:      string with the ID of the project this belongs to
//    permissions:  array of {userid: permission} items to tell what permissions the user has in the DFMEA
//                    allowable permissions are:  NULL, view, print, edit, admin
//    name:        string with a text identified for this
//    FMEA:         id of the root of the tree describing the FMEA data
//    header:       array of {fieldName:content}  entries describing the header for the FMEA
//    created:      {userid: timestamp} telling who created the FMEA
//    revised:       array of {userid: timestamp} telling who saved edits to the FMEA
  

  if (Nodes.find().count() === 0) {// populate with some data
      var topNode=Nodes.insert({
       categoryName: "FMEAroot",
        parentCategory: dfmea_id,
        subcategories: [],
        content: "Root of this DFMEA body",
        timestamp: timestamp
     });
    DFMEAs.update({_id: dfmea_id}, {$push: {subcategories: topNode}});
    timestamp+=1;
     for ( i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
      // Insert the functions
      var fctn_id = Nodes.insert({
        categoryName: "DesignFunction",
        parentCategory: topNode,
        subcategories: [],
        content: "Design Function " + i,
        timestamp: timestamp
      });
      timestamp+=1;
      Nodes.update({_id: topNode}, {$push: {subcategories: fctn_id}});
      for ( j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
        var fmode_id = Nodes.insert({
          categoryName: "FailureMode",
          parentCategory: fctn_id,
          subcategories: [],
          content: "Doesn't work " + j,
          timestamp: timestamp
        });
        timestamp+=1;
        Nodes.update({_id: fctn_id}, {$push: {subcategories: fmode_id}});
        for ( k = 0; k < Math.floor(Math.random() * 5) + 1; k++) {
          var effects_id = Nodes.insert({
            categoryName: "FailureEffect",
            parentCategory: fmode_id,
            subcategories: [],
            content: "Everyone dies " + k,
            timestamp: timestamp
          });
          timestamp+=1;
          Nodes.update({_id: fmode_id}, {$push: {subcategories: effects_id}});
          var SEV_id=Nodes.insert({
            categoryName: "SEV",
            parentCategory: effects_id,
            subcategories: [],
            content: (Math.floor(Math.random()*10)+1),
            timestamp: timestamp
          });
          timestamp +=1;
          Nodes.update({_id: effects_id}, {$push: {subcategories: SEV_id}});
           var class_id=Nodes.insert({
            categoryName: "Class",
            parentCategory: SEV_id,
            subcategories: [],
            content: " ",
            timestamp: timestamp
          });
          timestamp +=1;
          Nodes.update({_id: SEV_id}, {$push: {subcategories: class_id}});
          for ( l = 0; l < Math.floor(Math.random() * 5) + 1; l++) {
            var cause_id = Nodes.insert({
              categoryName: "FailureCause",
              parentCategory: class_id,
              subcategories: [],
              content: "Something broke " + l,
              timestamp: timestamp
            });
            timestamp+=1;
            Nodes.update({_id: class_id}, {$push: {subcategories: cause_id}});
            var OCC_id=Nodes.insert({
              categoryName: "OCC",
              parentCategory: cause_id,
              subcategories: [],
              content: (Math.floor(Math.random()*10)+1),
              timestamp: timestamp
            });
            timestamp+=1;
            Nodes.update({_id: cause_id}, {$push: {subcategories: OCC_id}});
            for ( m = 0; m < 1; m++) {
              var detec_id = Nodes.insert({
                categoryName: "DesignControl",
                parentCategory: OCC_id,
                subcategories: [],
                content: "Test regimen that has a long-ass list of stuff like thermal shock, shake and bake, drop testing, and other stuff" + m,
                timestamp: timestamp
              });
              timestamp+=1;   
              Nodes.update({_id: OCC_id}, {$push: {subcategories: detec_id }});       
             var DET_id=Nodes.insert({
              categoryName: "DET",
              parentCategory: detec_id,
              subcategories: [],
              content: (Math.floor(Math.random()*10)+1),
              timestamp: timestamp
              });
             timestamp+=1;
             Nodes.update({_id: detec_id}, {$push: {subcategories: DET_id }});
            };
          };
        };
      };
    }
  }
  Nodes.allow(
  {
  insert: function (userId, doc) {
    // the user must be logged in, and the document must be owned by the user
    return true;
  },
  update: function (userId, doc, fields, modifier) {
    // can only change your own documents
    return true;
  },
  remove: function (userId, doc) {
    // can only remove your own documents
    return true;
  }
});

});
