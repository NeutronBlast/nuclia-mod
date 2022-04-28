import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { map, filter, take, mapTo } from 'rxjs/operators';
import { EntitiesGroup } from '@nuclia/core';
import { EntitiesService } from '../services/entities.service';
import { MutableEntitiesGroup, Entity } from './model';

@Injectable()
export class EntitiesEditService {

  private groups = new BehaviorSubject<{ [key: string]: MutableEntitiesGroup }>({});
  private addedEntity = new Subject<{ entity: Entity, group: string }>();

  constructor(private entitiesService: EntitiesService) { }

  getGroup(groupKey: string): Observable<MutableEntitiesGroup | null> {
    return this.groups.pipe(
      map((groups) => groups[groupKey] || null)
    )
  }

  getGroups(): Observable<{ [key: string]: MutableEntitiesGroup }> {
    return this.groups.asObservable();
  }

  isEditMode(groupKey: string): Observable<boolean> {
    return this.getGroup(groupKey).pipe(map((value) => !!value));
  }

  getEditMode(): Observable<{ [key: string]: boolean }> {
    return this.groups.pipe(map((groups) => {
      const result: { [key: string]: boolean } = {};
      Object.entries(groups).forEach(([key, value]) => {
        result[key] = !!value;
      });
      return result;
    }))
  }

  addEntity(group: string, entityName: string) {
    const isEditMode = !!this.groups.getValue()[group];
    let editableGroup$: Observable<MutableEntitiesGroup>;
    if (isEditMode)  {
      editableGroup$ = of(this.groups.getValue()[group]);
    }
    else {
      editableGroup$ = this.entitiesService.getGroup(group).pipe(
        filter((group): group is EntitiesGroup => !!group),
        map(group => new MutableEntitiesGroup(group))
      );
    }
    editableGroup$.pipe(take(1)).subscribe((editableGroup) => {
      const entity = editableGroup.addEntity(entityName);
      if (isEditMode) {
        this.setGroup(group, editableGroup);
        this.addedEntity.next({entity, group: group});
      }
      else {
        this.entitiesService.setGroup(group, editableGroup).subscribe(() => {
          this.addedEntity.next({entity, group: group});
        })
      }
    })
  }

  getAddedEntity(group: string): Observable<Entity> {
    return this.addedEntity.pipe(
      filter((added) => added.group === group),
      map(added => added.entity)
    );
  }

  initGroup(groupKey: string, group: EntitiesGroup) {
    const groups = this.groups.getValue();
    groups[groupKey] = new MutableEntitiesGroup(group);
    this.groups.next(groups);
  }

  setGroup(groupKey: string, group: MutableEntitiesGroup) {
    const groups = this.groups.getValue();
    groups[groupKey] = group;
    this.groups.next(groups);
  }

  saveGroup(groupKey: string): Observable<null> {
    const groups = this.groups.getValue();
    if (groups[groupKey]) {
      return this.entitiesService
        .setGroup(groupKey, groups[groupKey])
        .pipe(mapTo(null));
    }
    else {
      return of(null);
    }
  }

  clearGroup(groupKey: string) {
    const groups = this.groups.getValue();
    if (groups[groupKey]) {
      delete groups[groupKey];
      this.groups.next(groups);
    }
  }
}