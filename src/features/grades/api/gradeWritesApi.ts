import type {createHttpClient} from '../../../shared/api/http';
import type {Authorized} from '../../academics/api/semestersApi';
import {createGradeConfigurationsApi} from './gradeConfigurationsApi';
import {createGradeScoresApi} from './gradeScoresApi';

// Both endpoints share one server version and one workspace write/review gate.
export function createGradeWritesApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]){
  return {...createGradeConfigurationsApi(baseUrl,authorized,options),saveScores:createGradeScoresApi(baseUrl,authorized,options).save};
}
