define(function(require, exports, module) {
    "use strict";

    // Brackets modules
    var EditorManager = brackets.getModule("editor/EditorManager"),
        AppInit = brackets.getModule("utils/AppInit"),
        MainViewManager = brackets.getModule("view/MainViewManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        FileUtils = brackets.getModule("file/FileUtils"),
        FileSystem = brackets.getModule("filesystem/FileSystem"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        Strings = brackets.getModule("strings"),
        STRINGS = require("modules/Strings"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    var SLDialog_tmp = require("text!htmlContent/dialog_storage_location_setting.html"),
        SLDialog,
        templateCss = require("text!templateCss/template.less"),
        commandID2 = "jzmstrjp.color_the_tag_name.customaize_tag_color",
        userCssFileName = "color_the_tag_name.less",
        context = { Strings: Strings, MyStrings: STRINGS };

    var preferencesID = "jzmstrjp.color_the_tag_name",
        prefs = PreferencesManager.getExtensionPrefs(preferencesID);



    function optimizePath(path){
    	if (path.slice(0, 1) === "/") { // For Mac.
        path = "file://" + path;
      }
      return path;
    }


    function fileExists(path, userCssFileName, callbackFunc){
    	var motoPath = path;
    	path = optimizePath(path);
    	FileSystem.resolve(path + userCssFileName, function(errorString, fileSystemEntry, fileSystemStats){
    		if(fileSystemEntry　&&　fileSystemEntry._isFile){
    			callbackFunc(true, motoPath, userCssFileName);
    		}else{
    			callbackFunc(false, motoPath, userCssFileName);
    		}
    	});
    }

    function prepCss(path) {
			if (!path) {
				ExtensionUtils.loadStyleSheet(module, "main.less");
      } else {
        fileExists(path, userCssFileName, loadCss);
      }
    }

    function loadCss(bool, motoPath, userCssFileName){
    	if(!bool){
    		ExtensionUtils.loadStyleSheet(module, "main.less");
    	} else {
    		ExtensionUtils.loadStyleSheet(module, motoPath + userCssFileName);
    	}
    }

    

    function prepSaveOriginalCss(path) {
        path = path.replace(/\\|\\/g, '/');
        if (path.slice(-1) != "/") {
            path += "/";
        }
        fileExists(path, userCssFileName, saveOriginalCss);
    }

    function saveOriginalCss(bool, motoPath, userCssFileName) {
    	var fileEntry = FileSystem.getFileForPath(motoPath + userCssFileName);
      if(bool){
      	alert('Css file already exists. Please edit ' + userCssFileName + '.')
      } else {
        FileUtils.writeText(fileEntry, templateCss, false).done(function() {
          alert('CSS Saved. Please edit ' + userCssFileName + '.');
        });
        prefs.set("userCssPath", motoPath);
        prefs.save();
      }
      MainViewManager.addToWorkingSet("first-pane", fileEntry);
    }


    function openDialog() {
        var dl = Dialogs.showModalDialogUsingTemplate(Mustache.render(SLDialog_tmp, context));
        SLDialog = dl.getElement();
        //loadPrefs(SLDialog);
        SLDialog.on('click', '.dialog-button-save', function() {
            prepSaveOriginalCss($('#location_path', SLDialog).val());
        });
    		SLDialog.on('click', '#button', function() {
          FileSystem.showOpenDialog(false, true, null, null, null, function(str, arr) {
	            $('#location_path', SLDialog).val(arr);
	        });
        });
    }




    CommandManager.register("Customize Tag Colors", commandID2, openDialog);




    var cmTag;
    var cmAttr;
    var overlay = {
        token: function(stream, state) {
            var ch;
            if (stream.match(/<(\/|)/)) {
                return "open-bracket";
            } else if (stream.match(/(\/|)>/)) {
                return "close-bracket";
            }
            while (stream.next() != null && !stream.match(/<(\/|)|(\/|)>/, false)) {}
            return null;
        }
    };



    function tag_color_change() {
        Array.prototype.forEach.call(cmTag, function(elm, i, arr) {
            var html = elm.innerHTML;
            if (!elm.classList.contains("cm-bracket")) {
                if (arr[i - 1].classList.contains("cm-open-bracket")) {
                    arr[i - 1].setAttribute("data-tag-name", html);
                }
                elm.setAttribute("data-tag-name", html);
                if (arr[i + 1] && arr[i + 1].classList.contains("cm-close-bracket")) {
                    arr[i + 1].setAttribute("data-tag-name", html);
                }
            }
        });
        Array.prototype.forEach.call(cmAttr, function(elm, i, arr) {
            var html = elm.innerHTML;
            elm.setAttribute("data-attr-name", html);
        });
    }

    function updateUI() {
        cmTag = document.getElementById("editor-holder").getElementsByClassName("cm-tag");
        cmAttr = document.getElementById("editor-holder").getElementsByClassName("cm-attribute");
        var editor = EditorManager.getCurrentFullEditor();
        var cm = editor._codeMirror;
        cm.removeOverlay(overlay);
        cm.addOverlay(overlay);
        cm.on("update", tag_color_change);
    }

    // Initialize extension
    AppInit.appReady(function() {
        MainViewManager.on("currentFileChange", updateUI);
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(commandID2);
        prepCss(prefs.get("userCssPath"));
    });
});
