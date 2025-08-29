import { getCvData, getCvDesign } from './loader'
// NOTE: Runtime no longer uses static JSON fallback. These exports are strictly for tests / story-like examples.
export const sampleCvData = getCvData('en')
export const sampleCvDesign = getCvDesign('en')

