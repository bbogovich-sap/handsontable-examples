let oHotTable;
/*
Prepare dataset.  There are two formats for the data - one in object form, with the formulas and values
separated into different properties, and another with the raw array of data and formulas to use as an input to
hyperformula.
 */
const nRows = 500, nCols = 26;
const aColumns = [], aData = [];
const sColumnIds = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const oDataToColumn = {};
for (let i = 0; i < nCols; i++){
	aColumns.push({data: sColumnIds[i] + ".value"});
	oDataToColumn[sColumnIds[i] + ".value"] = i;
}
for (let i = 0; i < nRows; i++){
	const oRow = {};
	for (let j = 0; j < nCols; j++){
		oRow[sColumnIds[j]] = { value: i * nCols + j };
	}
	aData.push(oRow);
}
//extract the data for hyperformula from the object data
const aRawData = aData.map((oRow) => {
	const aColData = [];
	for (let j = 0; j < nCols; j++){
		aColData.push(oRow[sColumnIds[j]].value);
	}
	return aColData;
});
//revise the first row to contain formula for sum of all values in each column
aRawData[0] = [];
for (let j = 0; j < nCols; j++){
	const aCellReferences = [];
	const sColId = sColumnIds[j];
	for (let i = 1; i < nRows - 1; i++){
		aCellReferences.push(sColId + (i + 1));
	}
	aRawData[0].push("=SUM(" + aCellReferences.join(",") + ")");
	aData[0][sColId].formula = aRawData[0][j];
}

//Declare a JSONRPC wrapper for the hyperformula web worker
const oWorker = new RpcWorker("hyperformula_worker.js");
function applyChangesFromWorker(oCalculationChanges){
	Object.keys(oCalculationChanges).forEach((sKey)=>{
		const nRow = parseInt(sKey, 10);
		Object.keys(oCalculationChanges[nRow]).forEach((sColKey)=>{
			const nCol = parseInt(sColKey, 10);
			console.log("setDataAtCell", nRow, nCol, oCalculationChanges[nRow][nCol]);
			oHotTable.setDataAtCell(nRow, nCol, oCalculationChanges[nRow][nCol], "custom");
		});
	});
}
addEventListener("DOMContentLoaded", (event) => {
	document.querySelector("#calcMessage").style.display = "none";
	oHotTable = new Handsontable(document.querySelector("#hot"), {
		licenseKey: "non-commercial-and-evaluation",
		data: aData,
		columns: aColumns,
		afterChange: (changes, source) => {
			//we don't want to process the afterChange if the source is the calculations from worker or it will become
			//a crazy infinite loop
			if (source !== "custom"){
				if (changes){
					document.querySelector("#calcMessage").style.display = "block";
					oWorker.exec("change", changes.map(([nRow, sData, nOldValue, nNewValue]) => {
						return [nRow, oDataToColumn[sData], nOldValue, nNewValue];
					})).then((oCalculationChanges)=>{
						console.log("change promise settled");
						applyChangesFromWorker(oCalculationChanges);
						//console.log(oCalculationChanges);
						document.querySelector("#calcMessage").style.display = "none";
					});
				}
			}
		}
	});

	//Post the initial dataset to the web worker
	document.querySelector("#calcMessage").style.display = "block";
	oWorker.exec("setData", { data: aRawData, columns: aColumns }).then((oCalculationChanges)=>{
		console.log("setData promise settled");
		//console.log(oCalculationChanges);
		applyChangesFromWorker(oCalculationChanges);
		document.querySelector("#calcMessage").style.display = "none";
	});
});

