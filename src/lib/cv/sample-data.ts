import { getCvData, getCvDesign } from './loader'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'
import cvEn from './data/cv.en.json'
import designEn from './data/design.en.json'
// Async loader + cached snapshots for tests that previously expected sync constants.
let dataCache: CvData | undefined
let designCache: CvDesign | undefined
export const sampleCvDataPromise: Promise<CvData> = getCvData('en').then(d => (dataCache = d))
export const sampleCvDesignPromise: Promise<CvDesign> = getCvDesign('en').then(d => (designCache = d))
// Synchronous fallbacks for tests that access immediately
export function getSampleCvDataSync(): CvData {
	return dataCache ?? CvDataSchema.parse(cvEn)
}
export function getSampleCvDesignSync(): CvDesign {
	return designCache ?? CvDesignSchema.parse(designEn)
}
// Legacy named exports kept for minimal test refactor; redefine after promises resolve.
let _sampleCvData: CvData | undefined
let _sampleCvDesign: CvDesign | undefined
void sampleCvDataPromise.then(d => { _sampleCvData = d })
void sampleCvDesignPromise.then(d => { _sampleCvDesign = d })
export const sampleCvData = new Proxy({}, { get(_,_prop: string){
	const snapshot = _sampleCvData ?? CvDataSchema.parse(cvEn)
	// @ts-expect-error dynamic
	return snapshot[_prop]
}}) as unknown as CvData
export const sampleCvDesign = new Proxy({}, { get(_,_prop: string){
	const snapshot = _sampleCvDesign ?? CvDesignSchema.parse(designEn)
	// @ts-expect-error dynamic
	return snapshot[_prop]
}}) as unknown as CvDesign

