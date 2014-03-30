

// Publish complete set of lists to all clients.
Meteor.publish('dfmeas', function () {
  return DFMEAs.find();
});


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

// Publish all items for requested list_id.
Meteor.publish('nodes', function (list_id) {
  check(list_id, String);
//  return Nodes.find({parentCategory: list_id});
  return Nodes.find();
});

