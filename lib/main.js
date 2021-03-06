const {Cc,Ci,Cm,Cr,Cu} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

exports.main = function(options, callbacks) {
    OopsTab.startup();
};

exports.onUnload = function(aOptions, aCallbacks) {
  OopsTab.shutdown();
};

var OopsTab = {
    mWindow: null,
    mMainWindow: null,
    mContainer: null,
    mBrowser: null,
    mListener: null,
    ss: null,
    consoleService: null,
    extId: "oopstab@glasstowerstudios.com",
    mTimeout: null,

    startup: function() {
      this.prefName = "extensions." + this.extId + ".timeout";
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
      this.mListener = function(e) { OopsTab.tabAdded(e); }
      this.mContainer.addEventListener("TabOpen", this.mListener, false);
      this.mTimeout = OopsTab.getPrefValue();
      this.consoleService.logStringMessage("OopsTab timeout preference: " + this.mTimeout);
      this.consoleService.logStringMessage("OopsTab Finished Startup");
    },

    shutdown: function() {
      this.consoleService.logStringMessage("Shutting down OopsTab");
      this.mContainer.removeEventListener("TabOpen", this.mListener, false);
      var prefBranchRemove = "extensions." + this.extId + ".";
      this.consoleService.logStringMessage("Clearing pref branch: " + prefBranchRemove);
      var prefLoader = require('./prefloader.js');
      prefLoader.clearPrefBranch(prefBranchRemove);
      this.consoleService.logStringMessage("OopsTab shutdown complete");
    },

    getPrefValue: function() {
      this.consoleService.logStringMessage("OopsTab requesting timeout preference value: " + this.prefName);
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

