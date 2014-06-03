const {Cc,Ci,Cm,Cr,Cu} = require("chrome");
gConsoleService = Cc["@mozilla.org/consoleservice;1"]
                              .getService(Ci.nsIConsoleService);
Cu.import("resource://gre/modules/Services.jsm");

// Stuff from flagfox.wordpress.com
function getGenericPref(branch,prefName)
{
    switch (branch.getPrefType(prefName))
    {
        default:
        case 0:   return undefined;                      // PREF_INVALID
        case 32:  return getUCharPref(prefName,branch);  // PREF_STRING
        case 64:  return branch.getIntPref(prefName);    // PREF_INT
        case 128: return branch.getBoolPref(prefName);   // PREF_BOOL
    }
}
function setGenericPref(branch,prefName,prefValue)
{
    gConsoleService.logStringMessage("OopsTab setting preference with name: " + prefName);
    switch (typeof prefValue)
    {
      case "string":
          setUCharPref(prefName,prefValue,branch);
          return;
      case "number":
          branch.setIntPref(prefName,prefValue);
          return;
      case "boolean":
          branch.setBoolPref(prefName,prefValue);
          return;
    }
}
function setDefaultPref(prefName,prefValue)
{
    gConsoleService.logStringMessage("OopsTab setting preference with name: " + prefName);
    var defaultBranch = Services.prefs.getDefaultBranch(null);
    setGenericPref(defaultBranch,prefName,prefValue);
}
function getUCharPref(prefName,branch)  // Unicode getCharPref
{
    branch = branch ? branch : Services.prefs;
    return branch.getComplexValue(prefName, Ci.nsISupportsString).data;
}
function setUCharPref(prefName,text,branch)  // Unicode setCharPref
{
    var string = Cc["@mozilla.org/supports-string;1"]
                           .createInstance(Ci.nsISupportsString);
    string.data = text;
    branch = branch ? branch : Services.prefs;
    branch.setComplexValue(prefName, Ci.nsISupportsString, string);
}

exports.main = function(options, callbacks) {
    OopsTab.startup();
};

var OopsTab = {
    mWindow: null,
    mMainWindow: null,
    mContainer: null,
    mBrowser: null,
    ss: null,
    consoleService: null,
    prefName: "extensions.oopstab.timeout",
    mTimeout: null,

    startup: function() {
      this.consoleService = Cc["@mozilla.org/consoleservice;1"]
                              .getService(Ci.nsIConsoleService);

      this.ss = require("sdk/simple-storage");
      this.mWindow = require("sdk/deprecated/window-utils").activeBrowserWindow;
      this.mMainWindow = this.mWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShellTreeItem)
                           .rootTreeItem
                           .QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIDOMWindow);
      this.mBrowser = this.mMainWindow.gBrowser;
      this.mContainer = this.mBrowser.tabContainer;
      this.mContainer.addEventListener("TabOpen", function(e) { OopsTab.tabAdded(e) });
      this.consoleService.logStringMessage("OopsTab Loading default prefs");
      this.consoleService.logStringMessage("Services.scriptloader: " + Services.scriptloader);
      Services.scriptloader.loadSubScript("chrome://oopstab/content/oopstab.js", {pref:setDefaultPref} );
      this.mTimeout = OopsTab.getPrefValue();
      this.consoleService.logStringMessage("OopsTab timeout preference: " + this.mTimeout);
      this.consoleService.logStringMessage("OopsTab Finished Startup");
    },

    getPrefValue: function() {
      this.consoleService.logStringMessage("OopsTab requesting timeout preference value.");
      return require("sdk/preferences/service").get(this.prefName);
    },
    
    keyPressed: function(event) {
      var nsIDOMKeyEvent = Ci.nsIDOMKeyEvent;
      const ESCAPE_KEY = nsIDOMKeyEvent.DOM_VK_ESCAPE;
      var mySs = OopsTab.ss;
      if (event.keyCode === ESCAPE_KEY) {
        OopsTab.doClose(mySs.storage.tabClosaTab);
      }
    },
    
    tabRemoved: function(event) {
      this.consoleService.logStringMessage("OopsTab detected a removed tab.");
      this.ss.storage.tabClosaTab = null;
      this.disableTimer();
    },
    
    tabAdded: function(event) {
        this.consoleService.logStringMessage("OopsTab detected a new tab.");
        this.mBrowser.onkeypress = this.keyPressed;
        this.mMainWindow.onkeypress = this.keyPressed;
        this.ss.storage.tabClosaTab = event.target;
        this.ss.storage.tabClosaTimer = require('sdk/timers');
        this.ss.storage.tabClosaTimer.setTimeout(function() {
          OopsTab.timerExpired();
        }, OopsTab.getPrefValue());
        this.consoleService.logStringMessage("OopsTab timer initialized with timeout of " + OopsTab.getPrefValue());
        this.mContainer.addEventListener("TabClose", function(e) { OopsTab.tabRemoved(e); });
    },

    doClose: function(tab) {
      this.consoleService.logStringMessage("OopsTab close requested.");
      if (tab) {
        this.consoleService.logStringMessage("OopsTab closing new tab.");
        this.mBrowser.removeTab(tab);
        this.disableTimer();
      } else {
          var scriptError = Cc["@mozilla.org/scripterror;1"]
                            .createInstance(Ci.nsIScriptError);
          scriptError.init("Unable to close nonexistent tab!", "main.js", "tab",60, 
                           0, 0, "OopsTab");
          this.consoleService.logMessage(scriptError);
      }
    },
    
    disableTimer: function() {
      this.consoleService.logStringMessage("OopsTab disabling timer.");
      if (this.ss.storage.tabClosaTimer) {
        this.ss.storage.tabClosaTimer.clearTimeout();
      }
      this.mBrowser.onkeypress = null;
      this.mMainWindow.onkeypress = null;
      this.ss.storage.tabClosaTimer = null;
    },

    timerExpired: function() {
      this.consoleService.logStringMessage("OopsTab timer expired.");
      this.disableTimer();
    }
};

