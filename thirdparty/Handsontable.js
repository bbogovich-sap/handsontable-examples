/* global Handsontable */
sap.ui.loader.config({
	shim: {
		"tl/ibp/reuse/hotsheets/thirdparty/handsontable/handsontable.full.min": {
			"amd": true,
			"export": "Handsontable"
		}
	}
});
sap.ui.define(["tl/ibp/reuse/hotsheets/thirdparty/handsontable/handsontable.full.min", "sap/base/Log", "sap/ui/core/Element"], function(oHandsontable, Log, Element) {
	if (Handsontable){
		Log.info("Handsontable version " + Handsontable.version + "loaded");
	} else {
		Log.fatal("Handsontable libary could not be loaded");
	}
	return Element.extend("tl.ibp.reuse.hotsheets.thirdparty.Handsontable", {
		"metadata": {
			"library": "tl.ibp.reuse.hotsheets",
			"properties": {
				"handsontableVersion": {
					"type": "string"
				}
			}
		}
	});
});