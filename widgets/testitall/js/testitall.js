/*
	ioBroker.vis testitall Widget-Set

	version: "0.0.1"

	Copyright 2024 Gitte lutz.duennbier@web.de
*/
"use strict";

/* global $, vis, systemDictionary */

// add translations for edit mode
$.extend(true, systemDictionary, {
    // Add your translations here, e.g.:
    // "size": {
    // 	"en": "Size",
    // 	"de": "Größe",
    // 	"ru": "Размер",
    // 	"pt": "Tamanho",
    // 	"nl": "Grootte",
    // 	"fr": "Taille",
    // 	"it": "Dimensione",
    // 	"es": "Talla",
    // 	"pl": "Rozmiar",
    //  "uk": "Розмір"
    // 	"zh-cn": "尺寸"
    // }
});

// this code can be placed directly in testitall.html
vis.binds["testitall"] = {
    version: "0.0.1",
    showVersion: function () {
        if (vis.binds["testitall"].version) {
            console.log("Version testitall: " + vis.binds["testitall"].version);
            vis.binds["testitall"].version = null;
        }
    },
    createWidget: function (widgetID, view, data, style) {
        var $div = $("#" + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds["testitall"].createWidget(widgetID, view, data, style);
            }, 100);
        }

        var text = "";
        text += "OID: " + data.oid + "</div><br>";
        text += 'OID value: <span class="testitall-value">' + vis.states[data.oid + ".val"] + "</span><br>";
        text += 'Color: <span style="color: ' + data.myColor + '">' + data.myColor + "</span><br>";
        text += "extraAttr: " + data.extraAttr + "<br>";
        text += "Browser instance: " + vis.instance + "<br>";
        text += 'htmlText: <textarea readonly style="width:100%">' + (data.htmlText || "") + "</textarea><br>";

        $("#" + widgetID).html(text);

        // subscribe on updates of value
        function onChange(e, newVal, oldVal) {
            $div.find(".template-value").html(newVal);
        }
        if (data.oid) {
            vis.states.bind(data.oid + ".val", onChange);
            //remember bound state that vis can release if didnt needed
            $div.data("bound", [data.oid + ".val"]);
            //remember onchange handler to release bound states
            $div.data("bindHandler", onChange);
        }
    },
};

vis.binds["testitall"].showVersion();
