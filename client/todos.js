DFMEAs= new Meteor.Collection('dfmeas');
Nodes=new Meteor.Collection('nodes');
  // Client-side JavaScript, bundled and sent to client.

// Define Minimongo collections to match server/publish.js.
//Lists = new Meteor.Collection("lists");

var canDelete=false;
var canClone=false;
var canAdd=false;
var canHide=false;
var firstFMode, firstEffect,firstCause;
var FModeCount, EffectCount, CauseCount;

var treeSchema = ["DesignFunction","FailureMode","FailureEffect","SEV","Class","FailureCause","OCC","DesignControl","DET","RPN"];
var headerText= ["Function","Potential Failure Mode", "Potential Effect(s) of Failure", "Sev","Class","Potential Cause(s) (Mechanisms) of Failure","OCC","Current Design Controls", "DET", "RPN"];
var promptText = ["New function", "Failure Mode", "Effect of Failure", 10, "  ", "Potential Cause", 10, "Design Controls", 10 ];
LastCategory="";
stackOfNodes=[];
var tempStack=[]

var createSubtree=function(parentNodeID) {
  var newNodeCategory=Nodes.findOne({_id:parentNodeID}).categoryName;  
  var i=treeSchema.indexOf(newNodeCategory);
  if (!(i===undefined))
    {
   var timestamp = (new Date()).getTime();
    //i is now positioned to start making nodes
    var oldParentID=Nodes.findOne({subcategories:parentNodeID})._id;
    for (j=i;j<9;j+=1)
      {
      var newNode=Nodes.insert({
         categoryName: treeSchema[j],
         parentCategory: oldParentID,
         subcategories: [],
         content: promptText[j],
         timestamp: timestamp 
        });
      timestamp+=1;
      Nodes.update({_id:oldParentID},{$push: {subcategories: newNode}});
      oldParentID=newNode;
      }
    };
}

var destroyTree=function(currentNodeID)
{
  console.log(currentNodeID);
  var kids=Nodes.findOne({_id:currentNodeID}).subcategories;
  console.log(kids);
  if (kids.length > 0)
    for (i=1; i<kids.length; i++)
      { 
      console.log(kids[i]);
      destroyTree(kids[i]);
      //destroy parent link;
      }
  console.log (Nodes.findOne({subcategories:currentNodeID}));
  Nodes.update({subcategories: currentNodeID},{subcategories: {$pull: currentNodeID}});
  Nodes.remove({_id: currentNodeID});
}

Template.prepping.stuffArray=function() {
  var i;
  stackOfNodes=[];
  rootNode = Nodes.findOne({categoryName: "FMEAroot"});
  currNode=rootNode.subcategories;
  for (i=0; i<currNode.length;i++)
    {
    var temp = [currNode[i]]
    miniStuff(temp);
  }
};

var miniStuff=function(entryNode){
    var kids=Nodes.findOne({_id: entryNode[0]}).subcategories;
    var i;
    tempStack.push(entryNode);
    while (kids.length>0)
      {
        i=[kids.shift()];
        miniStuff(i);
      };
    if (tempStack.length>0) {stackOfNodes.push(tempStack)};
    tempStack=[];
};
 

var countLeaf=function(currNode) {
  
  var Leafcounter=0;
 
  switch (currNode.categoryName) {
    case treeSchema[5]:
    case treeSchema[6]:
    case treeSchema[7]:
    case treeSchema[8]:
    {
      return 1;
    }
    case treeSchema[4]: {
      return currNode.subcategories.length;
    }
    case treeSchema[0]:
    case treeSchema[1]:
    case treeSchema[2]:
    case treeSchema[3]: {
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
}};
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
Template.populateHeader.helpers ({
  getHeaders: function() {
    return headerText;
  },
  headername: function() {
    return this;
  }
})
Template.processRow.helpers ({
  getNodeContext: function() {
    if (!((this===undefined) || (this ===null)))
    {
      var newNode=Nodes.findOne({_id: this[0]});
      return(newNode.content);
    }
  },
  getNodeType: function() {
    if (!((this===undefined) || (this ===null)))
    {
      var newNode=Nodes.findOne({_id: this[0]});
      lastCategory=newNode.categoryName;
      return(newNode.categoryName);
    }
  },
  stackOfNodes: function() {
     return stackOfNodes;
  },
  rowList: function() {
    return(this);
  },
  countDET: function() {  //counts all the DETs (actually Causes) that are children of this node
    var temp = countLeaf(Nodes.findOne({_id:this[0]}));
    if (temp===0)
    {
      NeedTRFlag=true;
      return 1;
    }
    else
    {
     return temp;}
  },
  DETcell: function () {
    return (lastCategory==="DET");
  },
  RPNcalc: function() {
    var currentNode=Nodes.findOne({_id:this[0]});
    var RPN=parseInt(currentNode.content);
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
  editing: function () {
      return Session.equals('editing_itemname', this[0]);
    },
  numedit: function() {
   if (!((this===undefined) || (this ===null)))
    {
      var newNode=Nodes.findOne({_id: this[0]});
      lastCategory=newNode.categoryName;
      if ((newNode.categoryName==="DET") || (newNode.categoryName==="OCC") || (newNode.categoryName==="SEV"))
      return true;
    }
    return false;
  }
});

Template.processRow.events({
  'click .check': function () {
    return null;
  },

  'click .destroy': function () {
    return null;
  },

  'dblclick .display': function (evt, tmpl) {
    Session.set('editing_itemname', this[0]);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#item-input"));
  }
});

Template.renderAlpha.helpers ({
   stackOfNodes: function() {
    return stackOfNodes;
  }
 
});

Template.processRow.events(okCancelEvents(
  '#item-input',
  {
    ok: function (value) {
      Nodes.update(this[0], {$set: {content: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

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

////////// nodes //////////
var nodesHandle=null;
Template.nodes.loading = function () {
  return nodesHandle && !nodesHandle.ready();
};

Template.nodes.any_list_selected = function () {
  return !Session.equals('dfmea_id', null);
};

Template.nodes.events(okCancelEvents(
  '#new-item',
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

Template.iconography.events({
  'click .btn-add': function () {
    createSubtree(this[0]);
    Deps.flush();
    return null;
  },
  'click .btn-remove': function () {
    destroyTree(this[0]);
    Deps.flush();
    return null;
  },

});

Template.renderAlpha.helpers ({
   stackOfNodes: function() {
    return stackOfNodes;
  }
 
});

Template.iconography.helpers ({
  canAdd : function() {
   if ((lastCategory=== "DesignFunction")||(lastCategory === "FailureMode") || (lastCategory === "FailureEffect") || (lastCategory === "FailureCause"))
    //add user permission check 
    return true;
  else return false;
  },
  canCopy : function() {
    // not implemented yet
    return false;

    if ((lastCategory=== "DesignFunction")||(lastCategory === "FailureMode") || (lastCategory === "FailureEffect") || (lastCategory === "FailureCause"))
    //add user permission check 
    return true;
  else return false;
  },
  canClone : function() {
    // not implemented yet
    return false;
   if ((lastCategory=== "DesignFunction")||(lastCategory === "FailureMode") || (lastCategory === "FailureEffect") || (lastCategory === "FailureCause"))
    //add user permission check 
    return true;
  else return false;
  },
  canDelete : function() {
    if ((lastCategory=== "DesignFunction")||(lastCategory === "FailureMode") || (lastCategory === "FailureEffect") || (lastCategory === "FailureCause"))
    {
      var parentNode=Nodes.findOne({subcategories:this[0]});
      if (!(parentNode === undefined) && (parentNode.subcategories.length>1))
        return true;
      };
    return false;
  },
  canHide : function() {
    //not implemented yet
    return false;
//
  if ((lastCategory=== "DesignFunction")||(lastCategory === "FailureMode") || (lastCategory === "FailureEffect") || (lastCategory === "FailureCause"))
    //add user permission check 
    return true;
  else return false;
  },
  getNodeType: function() {
    if (!((this===undefined) || (this ===null)))
    {
      var newNode=Nodes.findOne({_id: this[0]});
      var temp=treeSchema.indexOf(newNode.categoryName);
      return(promptText[temp]);
    }
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
