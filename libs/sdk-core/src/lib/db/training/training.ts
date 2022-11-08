import { catchError, Observable, of } from 'rxjs';
import type { INuclia } from '../../models';
import type { WritableKnowledgeBox } from '../kb';
import { TrainingStatus, TrainingTask, TrainingType } from './training.models';

export class Training {
  kb: WritableKnowledgeBox;
  nuclia: INuclia;

  constructor(kb: WritableKnowledgeBox, nuclia: INuclia) {
    this.kb = kb;
    this.nuclia = nuclia;
  }

  start(type: TrainingType, labelsets?: string[]): Observable<TrainingTask> {
    return this.nuclia.rest.post<TrainingTask>(
      `${this.kb.path}/train/${type}/start`,
      labelsets ? { valid_labelsets: labelsets } : {},
    );
  }

  stop(type: TrainingType): Observable<TrainingTask> {
    return this.nuclia.rest.post<TrainingTask>(`${this.kb.path}/train/${type}/stop`, {});
  }

  getStatus(type: TrainingType): Observable<TrainingTask> {
    return this.nuclia.rest
      .get<TrainingTask>(`${this.kb.path}/train/${type}/inspect`)
      .pipe(catchError(() => of({ task: '', status: TrainingStatus.not_running } as TrainingTask)));
  }
}