import { NO_RESULTS, PENDING_RESULTS } from './models';
import type { WidgetAction, DisplayedResource } from './models';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  ReplaySubject,
  startWith,
  Subject,
  tap,
} from 'rxjs';
import type { IResource, Search, Widget } from '@nuclia/core';

let widgetActions: WidgetAction[] = [];
export const setWidgetActions = (actions: WidgetAction[]) => {
  widgetActions = actions;
};
export const getWidgetActions = () => widgetActions;

let _store: {
  query: BehaviorSubject<string>;
  suggestions: BehaviorSubject<Search.Results>;
  searchResults: BehaviorSubject<Search.Results | typeof PENDING_RESULTS>;
  triggerSearch: Subject<void>;
  hasSearchError: ReplaySubject<boolean>;
  widget: ReplaySubject<Widget>;
  displayedResource: BehaviorSubject<DisplayedResource>;
};

let _state: {
  query: Observable<string>;
  results: Observable<IResource[]>;
  paragraphs: Observable<Search.Paragraph[]>;
  hasSearchError: Observable<boolean>;
  pendingSuggestions: Observable<boolean>;
  pendingResults: Observable<boolean>;
  widget: Observable<Widget>;
  customStyle: Observable<string>;
  displayedResource: Observable<DisplayedResource>;
  getMatchingParagraphs: (resId: string) => Observable<Search.Paragraph[]>;
};

export const nucliaStore = () => {
  if (!_store) {
    _store = {
      query: new BehaviorSubject(''),
      suggestions: new BehaviorSubject(NO_RESULTS),
      searchResults: new BehaviorSubject(NO_RESULTS),
      triggerSearch: new Subject(),
      hasSearchError: new ReplaySubject(1),
      widget: new ReplaySubject(1),
      displayedResource: new BehaviorSubject({ uid: '' }),
    };
    _state = {
      query: _store.query.asObservable().pipe(
        tap(() => _store.hasSearchError.next(false)),
        map((q) => q.trim()),
        distinctUntilChanged(),
      ),
      results: _store.searchResults.pipe(
        filter((res) => !!res.resources),
        map((results) => Object.values(results.resources)),
        startWith([] as IResource[]),
      ),
      paragraphs: _store.suggestions.pipe(
        filter((res) => !!res.paragraphs?.results),
        map((res) => Object.values(res.paragraphs?.results)),
        startWith([] as Search.Paragraph[]),
      ),
      hasSearchError: _store.hasSearchError.asObservable(),
      pendingSuggestions: _store.suggestions.pipe(map((res) => (res as typeof PENDING_RESULTS).pending)),
      pendingResults: _store.searchResults.pipe(map((res) => (res as typeof PENDING_RESULTS).pending)),
      widget: _store.widget.asObservable(),
      customStyle: _store.widget.pipe(
        map((widget) =>
          Object.entries(widget?.style || {})
            .filter(([k, v]) => !!v)
            .reduce((acc, [k, v]) => `${acc}--custom-${k}: ${v};`, ''),
        ),
      ),
      displayedResource: _store.displayedResource.asObservable(),
      getMatchingParagraphs: (resId: string): Observable<Search.Paragraph[]> => {
        return _store.searchResults.pipe(
          map((results) => results.paragraphs?.results || []),
          map((paragraphs) => paragraphs.filter((p) => p.rid === resId)),
        );
      },
    };
  }
  return _store;
};

export const nucliaState = () => {
  nucliaStore();
  return _state;
};

export const resetStore = () => {
  Object.values(nucliaStore()).forEach((s) => s.complete());
  _store = undefined;
};

export const setDisplayedResource = (resource: DisplayedResource) => {
  nucliaStore().displayedResource.next(resource);
  nucliaStore().suggestions.next(NO_RESULTS);
};
