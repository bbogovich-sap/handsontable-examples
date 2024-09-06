/**
 * Wrapper for a web worker implementing JSONRPC so that the worker messages
 * can be implemented as transactional promises
 * 
 * @class RpcWorker
 */
class RpcWorker{
	constructor(sScript){
		console.log("RpcWorker constructor for " + sScript);
		this.nextId = 0;
		this.requests = new Map();
		this.oWorker = new Worker(sScript);
		this.oWorker.onmessage = this.onMessage.bind(this);
	}
	onMessage(oEvent){
		console.log("RpcWorker.onMessage for txid " + oEvent.data.id);
		const oData = oEvent.data;
		const oRequest = this.requests.get(oData.id);
		if (oRequest){
			if (oData.error){
				oRequest.reject(oData.error);
			} else {
				oRequest.resolve(oData.result);
			}
			this.requests.delete(oData.id);
		}
	}
	exec(method, args){
		return new Promise((resolve, reject) => {
			const id = this.nextId++;
			this.requests.set(id, {resolve, reject});
			this.oWorker.postMessage({"jsonrpc": "2.0", id, method, params: args});
		});
	}
}