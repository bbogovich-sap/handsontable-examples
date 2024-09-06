console.log("hyperformula_worker.js loaded");
//todo: why won't hyperformula load from the CDN?
//self.importScripts("https://cdn.jsdelivr.net/npm/hyperformula@2.7.1/dist/hyperformula.min.js", "./JSONRPC.js");

//importScripts is synchronous so no need to worry about initialization promises
self.importScripts("../../../../thirdparty/hyperformula/hyperformula.full.min.js", "./JSONRPC.js");

//initialize the hyperformula instance
const hfInstance = HyperFormula.buildEmpty({licenseKey: "gpl-v3"});
hfInstance.addSheet("TableData");
/**
 * Filter the results of a batch operation to only include formula related changes
 * 
 * @param {any} aChanges 
 * @returns {object} change object with row as keys and cell column plus values in the objects
 */
function filterResults(aChanges){
	const oCalculationChanges = {};
	let nFormulaChanges = 0;
	aChanges.forEach((oChange)=>{
		//we only care about changes that are formula related
		if (hfInstance.doesCellHaveFormula(oChange.address)){
			if (oChange.address.sheet === 0){
				if (!oCalculationChanges[oChange.address.row]){
					oCalculationChanges[oChange.address.row] = {};
				}
				oCalculationChanges[oChange.address.row][oChange.address.col] = oChange.newValue;
				nFormulaChanges++;
			}
		}
	});
	return oCalculationChanges;
}
/**
 * Write the number of changed cells to the console
 * 
 * @param {any} oCalculationChanges 
 * @param {any} sSource 
 */
function logChangeCount(oCalculationChanges, sSource){
	let nFormulaChanges = 0;
	Object.keys(oCalculationChanges).forEach((sKey)=>{
		const nRow = parseInt(sKey, 10);
		Object.keys(oCalculationChanges[nRow]).forEach((sColKey)=>{
			const nCol = parseInt(sColKey, 10);
			nFormulaChanges++;
		});
	});
	console.log(`${nFormulaChanges} updated for ${sSource}`)
}
/**
 * Event handler for when main thread sends the initial dataset to the worker
 * 
 * @param {any} { columns, data } 
 * @param {any} [txid=-1] 
 * @returns {void}
 */
function setData({ columns, data }, txid = -1){
	nChangeTime = Date.now();  //time that we start initial calculation run
	console.log(arguments);
	console.log(data);
	let aChanges;
	try{
		aChanges = hfInstance.batch(()=>{
			hfInstance.setSheetContent(0, data);
		});
	} catch (e){
		throw new Error(e.message, { code: JSONRPC_APPLICATION_ERROR });
	}
	const oCalculationChanges = filterResults(aChanges);
	logChangeCount(oCalculationChanges, "setData");
	return oCalculationChanges;
}

/**
 * Event handler for message calls from the main thread when a change is made to the table
 * 
 * @param {any} aChanges 
 * @param {any} [txid=-1] 
 * @returns 
 */
function onChange(aChanges, txid = -1){
	nChangeTime = Date.now();
	if (!aChanges){
		throw new Error("missing changes array", { code: JSONRPC_INVALID_PARAMS });
	}
	aResults = hfInstance.batch(()=>{
		aChanges.forEach(([nRow, nCol, , vNewValue])=>{
			console.log(arguments);
			hfInstance.setCellContents({
				row: nRow,
				col: nCol,
				sheet: 0
			}, [[vNewValue]]);
		});
	});
	const oCalculationChanges = filterResults(aResults);
	logChangeCount(oCalculationChanges, "change");
	return oCalculationChanges;
}

/**
 * Event handler for messages from the main thread
 * 
 * @param {any} e 
 */
onmessage = function (e) {
	const { method, params, id } = e.data;
	let oResults;
	console.log(`worker received message ${method} with txid ${id}`);
	try{
		switch (method) {
			case "setData":
				oResults = setData(params, id);
				break;
			case "change":
				oResults = onChange(params, id);
				break;
			default:
				oResults = null;
				break;
		}
		this.postMessage({"jsonrpc": "2.0", result: oResults, id});
	} catch ({ code, message }){
		this.postMessage({"jsonrpc": "2.0", error: { code, message }, id});
	}
};