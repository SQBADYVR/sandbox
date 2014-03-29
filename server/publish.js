

// Publish complete set of lists to all clients.
Meteor.publish('dfmeas', function () {
  return DFMEAs.find();
});



// Publish all items for requested list_id.
Meteor.publish('nodes', function (list_id) {
  check(list_id, String);
//  return Nodes.find({parentCategory: list_id});
  return Nodes.find();
});

