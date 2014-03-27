
  // Client-side JavaScript, bundled and sent to client.

// Define Minimongo collections to match server/publish.js.
Lists = new Meteor.Collection("lists");
DFMEAs= new Meteor.Collection("dfmeas");
Nodes = new Meteor.Collection("nodes");
firstCauseFlag=false;
lastWasCause=false;
var canCopy=false;
var canDelete=false;
var canClone=false;
var canAdd=false;
var canHide=false;
var firstFMode, firstEffect,firstCause;
var FModeCount, EffectCount, CauseCount;

var treeSchema = ["DesignFunction","FailureMode","FailureEffect","SEV","FailureCause","OCC","DesignControl","DET"];
var promptText = ["New function", "Failure Mode", "Effect of Failure", 10, "Potential Cause", 10, "Design Controls", 10 ];
LastCategory="";
NeedTRFlag=false;


Template.inject.rendered = function () {
    setTimeout(function () {
      $('#inject').html(Template.hello());
    }, 1000)};

var createSubtree=function(parentNodeID) {
  var newNodeCategory=Nodes.findOne({_id:parentNodeID}).categoryName;  
  var breakFlag=false;
  var i;
  for (i=0; !breakFlag && (i<8); i+=1)
  {
    if (newNodeCategory === treeSchema[i])
      breakFlag=true;
    else
      breakFlag=false;
  }
  i-=1;
  var timestamp = (new Date()).getTime();
  //i is now positioned to start making nodes
  var oldParentID=parentNodeID;
  for (;i<8;i+=1)
  {
    var newNode=Nodes.insert({
       categoryName: treeSchema[i],
       parentCategory: oldParentID,
       subcategories: [],
       content: promptText[i],
       timestamp: timestamp 
    });
    timestamp+=1;
    Nodes.update({_id:oldParentID},{$push: {subcategories: newNode._id}});
    oldParentID=newNode._id;
  };
}

var countLeaf=function(currNode) {
  
  var Leafcounter=0;
 
  switch (currNode.categoryName) {
    case treeSchema[4]:
    case treeSchema[5]:
    case treeSchema[6] :
    case treeSchema[7] : {
      return 1;
    }
    case treeSchema[3]: {
      return currNode.subcategories.length;
    }
    case treeSchema[0]:
    case treeSchema[1]:
    case treeSchema[2]: {
      var kids=Nodes.findOne({_id: currNode._id}).subcategories;
      var toprun=kids.length;
      for (var i=0; i < toprun; i++) {
        var temp=Nodes.findOne({_id:kids[i]});
        Leafcounter+=countLeaf(temp);
      }
      return Leafcounter;
      }
    default: {

    } return 0;
}
        };


Session.set('dfmea_id',null);

// ID of currently selected list
Session.setDefault('dfmea_id', null);

// Name of currently selected tag for filtering
Session.setDefault('tag_filter', null);

// When adding tag to a node, ID of the node
Session.setDefault('editing_addtag', null);

// When editing a list name, ID of the list
Session.setDefault('editing_listname', null);

// When editing node text, ID of the node
Session.setDefault('editing_itemname', null);

// Subscribe to 'lists' collection on startup.
//var dfmea_id=DFMEAs.find({name: "Test FMEA 1"});
//console.log(dfmea_id);
//Session.set("dfmea_id",dfmea_id);

// Select a list once data has arrived.
var dfmeaHandle = Meteor.subscribe('dfmeas', function () {
  if (!Session.get('dfmea_id')) {
    var dfmea = DFMEAs.findOne({name: "Test FMEA 1"}, {sort: {name: 1}});
    if (dfmea) {
       Router.setList(dfmea._id);
    }
  }
});
// Always be subscribed to the nodes for the selected list.
Deps.autorun(function () {
  var dfmea_id = Session.get('dfmea_id');
  if (dfmea_id)
    {
    nodesHandle = Meteor.subscribe('nodes', dfmea_id);
  }
  else
    nodesHandle = null;
});

//var nodesHandle = null;

////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};

var activateInput = function (input) {
  input.focus();
  input.select();
};

Template.lists.loading = function () {
  return !dfmeaHandle.ready();
};


////////// nodes //////////
var nodesHandle=null;
Template.nodes.loading = function () {
  return nodesHandle && !nodesHandle.ready();
};

Template.nodes.any_list_selected = function () {
  return !Session.equals('dfmea_id', null);
};

Template.nodes.events(okCancelEvents(
  '#new-node',
  {
    ok: function (text, evt) {
      var tag = Session.get('tag_filter');
      Nodes.insert({
        categoryName:  "BOGUS--needs fixed for new item entry",
        content: text,
        parentCategory: Session.get('dfmea_id'),
        subCategory:[],
        timestamp: (new Date()).getTime(),
      });
      evt.target.value = '';
    }
  }));

Template.nodes.nodes = function () {
  // Determine which nodes to display in main pane,
  // selected based on list_id and tag_filter.
  var parent=null;
  if (!parent) {
    parent = Session.get('dfmea_id');
   }

  //var sel = {ParentCategory: parent};

  //shut down tagging
  //var tag_filter = Session.get('tag_filter');
  //if (tag_filter)
  //  sel.tags = tag_filter;
  var nodelist=Nodes.find({parentCategory: parent});
  return nodelist;
};

Template.node_item.tag_objs = function () {
  var node_id = this._id;
  return _.map(this.tags || [], function (tag) {
    return {node_id: node_id, tag: tag};
  });
};

Template.node_item.done_class = function () {
  return this.done ? 'done' : '';
};

Template.node_item.done_checkbox = function () {
  return this.done ? 'checked="checked"' : '';
};

Template.node_item.editing = function () {
  return Session.equals('editing_itemname', this._id);
};

Template.node_item.adding_tag = function () {
  return Session.equals('editing_addtag', this._id);
};

Template.node_item.events({
  'click .check': function () {
    Nodes.update(this._id, {$set: {done: !this.done}});
  },

  'click .destroy': function () {
    Nodes.remove(this._id);
  },

  'click .addtag': function (evt, tmpl) {
    Session.set('editing_addtag', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#edittag-input"));
  },

  'dblclick .display .node-text': function (evt, tmpl) {
    Session.set('editing_itemname', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#node-input"));
  },

  'click .remove': function (evt) {
    var tag = this.tag;
    var id = this.node_id;

    evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    Meteor.setTimeout(function () {
      Nodes.update({_id: id}, {$pull: {tags: tag}});
    }, 300);
  }
});

Template.node_item.events(okCancelEvents(
  '#node-input',
  {
    ok: function (value) {
      Nodes.update(this._id, {$set: {content: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

Template.node_item.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Nodes.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

Template.renderDfctn.helpers ({
  doChildren : function() {
    var ID = this._id;
    LastCategory=this.categoryName;
    var retval = Nodes.find({parentCategory:ID});
    return retval;
  },
  debug:function() {
    console.log(this._id);
  },
  isFirstThing: function() {
    var newCategory=this.categoryName;
    console.log(newCategory);
    console.log(LastCategory);
    var retval= (treeSchema.indexOf(newCategory)>treeSchema.indexOf(LastCategory));
    LastCategory=newCategory;
    console.log(retval);
    console.log(this._id);
    return (retval);
    },
  countDETs: function() {  //counts all the DETs (actually Causes) that are children of this node
    var temp = countLeaf(this);
//    console.log(temp);
    return temp;
  }
});

Template.renderMode.helpers ({
  doChildren : function() {
    var ID = this._id;
    var retval = Nodes.find({parentCategory:ID});
    return retval;
  },
  debug:function() {
    console.log(this._id);
  },
  isFirstThing: function() {
    var newCategory=this.categoryName;
    console.log(newCategory);
    console.log(LastCategory);
    var retval= (treeSchema.indexOf(newCategory)>treeSchema.indexOf(LastCategory));
    LastCategory=newCategory;
    console.log(retval);
    console.log(this._id);
    return (retval);
    },
  countDETs: function() {  //counts all the DETs (actually Causes) that are children of this node
    var temp = countLeaf(this);
//    console.log(temp);
    return temp;
  }
});

Template.renderEffect.helpers ({
  doChildren : function() {
    var ID = this._id;
    var retval = Nodes.find({parentCategory:ID});
    return retval;
  },
  debug:function() {
    console.log(this._id);
  },
  isFirstThing: function() {
    var newCategory=this.categoryName;
    console.log(newCategory);
    console.log(LastCategory);
    var retval= (treeSchema.indexOf(newCategory)>treeSchema.indexOf(LastCategory));
    LastCategory=newCategory;
    console.log(retval);
    console.log(this._id);
    return (retval);
    },
  countDETs: function() {  //counts all the DETs (actually Causes) that are children of this node
    var temp = countLeaf(this);
//    console.log(temp);
    return temp;
  }
});

Template.renderCause.helpers ({
  doChildren : function() {
    var ID = this._id;
    var retval = Nodes.find({parentCategory:ID});
    return retval;
  },
  debug:function() {
    console.log(this._id);
  },
  isFirstThing: function() {
    var newCategory=this.categoryName;
    console.log(newCategory);
    console.log(LastCategory);
    var retval= (treeSchema.indexOf(newCategory)>treeSchema.indexOf(LastCategory));
    LastCategory=newCategory;
    console.log(retval);
    console.log(this._id);
    return (retval);
    },
  countDETs: function() {  //counts all the DETs (actually Causes) that are children of this node
    var temp = countLeaf(this);
    console.log(temp);
    return temp;
  },
  RPNcalc: function() {
    var RPN=parseInt(this.content);
    var currentNode=this;
    var rememberNode=this._id;
    do 
    {
      if (currentNode.categoryName==="OCC") {
        RPN*=parseInt(currentNode.content);
      }
      currentNode=Nodes.findOne({_id: currentNode.parentCategory});
    }
    while (!(currentNode.categoryName === "SEV"));
    RPN*=parseInt(currentNode.content);
    Nodes.findOne({_id:rememberNode});
    return RPN;
    }
});

////////// Render item data /////////

Template.render_item_data.tag_objs = function () {
  var node_id = this._id;
  return _.map(this.tags || [], function (tag) {
    return {node_id: node_id, tag: tag};
  });
};

Template.render_item_data.done_class = function () {
  return this.done ? 'done' : '';
};

Template.render_item_data.done_checkbox = function () {
  return this.done ? 'checked="checked"' : '';
};

Template.render_item_data.editing = function () {
  return Session.equals('editing_itemname', this._id);
};

Template.render_item_data.adding_tag = function () {
  return Session.equals('editing_addtag', this._id);
};

Template.render_item_data.subCategories = function() {
  var temp=this.subcategories;
  return temp;
}

Template.render_item_data.events(okCancelEvents(
  '#new-node',
  {
    ok: function (text, evt) {
      var tag = Session.get('tag_filter');
      Nodes.insert({
        categoryName:  "BOGUS--needs fixed for new item entry",
        content: text,
        parentCategory: Session.get('dfmea_id'),
        subCategory:[],
        timestamp: (new Date()).getTime(),
      });
      evt.target.value = '';
    }
  }));

Template.render_item_data.events({
 // 'click .check': function () {
 //   Nodes.update(this._id, {$set: {done: !this.done}});
 // },


// need to fix destroy to check that it's not the only item at its level 
// and then to destroy the entire subtree
// probably need 'undo' and a confirm
  'click .destroy': function () {
    Nodes.remove(this._id);
  },

//  'click .addtag': function (evt, tmpl) {
//    Session.set('editing_addtag', this._id);
//    Deps.flush(); // update DOM before focus
//    activateInput(tmpl.find("#edittag-input"));
//  },

  'dblclick .display .node-text': function (evt, tmpl) {
    Session.set('editing_itemname', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#node-input"));
  },

  'click .remove': function (evt) {
    var tag = this.tag;
    var id = this.node_id;

    evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    Meteor.setTimeout(function () {
      Nodes.update({_id: id}, {$pull: {tags: tag}});
    }, 300);
  }
});

Template.render_item_data.events(okCancelEvents(
  '#node-input',
  {
    ok: function (value) {
      Nodes.update(this._id, {$set: {content: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

Template.render_item_data.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Nodes.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

Template.render_item_data.helpers ({
  doChildren : function() {
    var ID = this._id;
    return Nodes.find({parentCategory: ID})
  },
  RPNcalc: function() {
    var RPN=parseInt(this.content);
    var currentNode=this;
    do 
    {
      if (currentNode.categoryName==="OCC") {
        RPN*=parseInt(currentNode.content);
      }
      currentNode=Nodes.findOne({_id: currentNode.parentCategory});
    }
    while (!(currentNode.categoryName === "SEV"));
    RPN*=parseInt(currentNode.content);
    return RPN;
    },
  iconsAllowed: function() {
    canCopy=false;
    canDelete=false;
    canClone=false;
    canAdd=false;
    canHide=false;

    //  Turn on variables by field.
    //  Then turn off by user permissions
    var columnType=this.categoryName;
    if ((columnType=== "DesignFunction")||(columnType === "FailureMode") || (columnType === "FailureEffect") || (columnType === "FailureCause"))
    {
      canCopy=true;
      canDelete=true;  //need to ensure we don't delete if it's the only member.
      canClone=true;
      canAdd=true;
      canHide=true;  //need to switch icon to eyes open if children are hidden.
      }

    // turn off by user permissions

    return canCopy||canDelete||canClone||canAdd||canHide;
  }
});

Template.iconography.helpers ({
  canAdd : function() {
    console.log(canAdd);
    return (canAdd);
  },
  canCopy : function() {
    return (canCopy);
  },
  canClone : function() {
    return (canClone);
  },
  canDelete : function() {
    return (canDelete);
  },
  canHide : function() {
    return (canHide);
  }
});
////////// Tag Filter //////////

// Pick out the unique tags from all nodes in current list.
Template.tag_filter.tags = function () {
  var tag_infos = [];
  var total_count = 0;

  Nodes.find({list_id: Session.get('list_id')}).forEach(function (node) {
    _.each(node.tags, function (tag) {
      var tag_info = _.find(tag_infos, function (x) { return x.tag === tag; });
      if (! tag_info)
        tag_infos.push({tag: tag, count: 1});
      else
        tag_info.count++;
    });
    total_count++;
  });

  tag_infos = _.sortBy(tag_infos, function (x) { return x.tag; });
  tag_infos.unshift({tag: null, count: total_count});

  return tag_infos;
};

Template.tag_filter.tag_text = function () {
  return this.tag || "All items";
};

Template.tag_filter.selected = function () {
  return Session.equals('tag_filter', this.tag) ? 'selected' : '';
};

Template.tag_filter.events({
  'mousedown .tag': function () {
    if (Session.equals('tag_filter', this.tag))
      Session.set('tag_filter', null);
    else
      Session.set('tag_filter', this.tag);
  }
});

////////// Tracking selected list in URL //////////

var nodesRouter = Backbone.Router.extend({
  routes: {
    ":dfmea_id": "main"
  },
  main: function (dfmea_id) {
    var oldList = Session.get("dfmea_id");
    if (oldList !== dfmea_id) {
      Session.set("dfmea_id", dfmea_id);
      Session.set("tag_filter", null);
    }
  },
  setList: function (dfmea_id) {
    this.navigate(dfmea_id, true);
  }
});

Router = new nodesRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
