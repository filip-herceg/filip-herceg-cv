import { getCvData, getCvDesign } from './loader'
import type { CvData, CvDesign } from './schema'
// Async loader + cached snapshots for tests that previously expected sync constants.
let dataCache: CvData | undefined
let designCache: CvDesign | undefined
export const sampleCvDataPromise: Promise<CvData> = getCvData('en').then(d => (dataCache = d))
export const sampleCvDesignPromise: Promise<CvDesign> = getCvDesign('en').then(d => (designCache = d))
export function getSampleCvDataSync(): CvData {
	if (!dataCache) throw new Error('sampleCvData not loaded yet; await sampleCvDataPromise first')
	return dataCache
}
export function getSampleCvDesignSync(): CvDesign {
	if (!designCache) throw new Error('sampleCvDesign not loaded yet; await sampleCvDesignPromise first')
	return designCache
}
// Legacy named exports kept for minimal test refactor; redefine after promises resolve.
let _sampleCvData: CvData | undefined
let _sampleCvDesign: CvDesign | undefined
void sampleCvDataPromise.then(d => { _sampleCvData = d })
void sampleCvDesignPromise.then(d => { _sampleCvDesign = d })
export const sampleCvData = new Proxy({}, { get(_,_prop: string){
	if(!_sampleCvData) throw new Error('sampleCvData not loaded yet; await sampleCvDataPromise first')
	// @ts-expect-error dynamic
	return _sampleCvData[_prop]
}}) as unknown as CvData
export const sampleCvDesign = new Proxy({}, { get(_,_prop: string){
	if(!_sampleCvDesign) throw new Error('sampleCvDesign not loaded yet; await sampleCvDesignPromise first')
	// @ts-expect-error dynamic
	return _sampleCvDesign[_prop]
}}) as unknown as CvDesign

