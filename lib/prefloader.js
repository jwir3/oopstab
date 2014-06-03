/**
 * This code was originally taken from
 * http://flagfox.wordpress.com/2014/01/19/writing-restartless-addons/
 */

const {Cc,Ci,Cm,Cr,Cu} = require("chrome");
var gConsoleService = Cc["@mozilla.org/consoleservice;1"]
                              .getService(Ci.nsIConsoleService);
gConsoleService.logStringMessage("Prefloader loading.");
Cu.import("resource://gre/modules/Services.jsm");

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

gConsoleService.logStringMessage("Prefloader about to set exports.");

exports.setDefaultPref = setDefaultPref;

gConsoleService.logStringMessage("Prefloader export complete.");
