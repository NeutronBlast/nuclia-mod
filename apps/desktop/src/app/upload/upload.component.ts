import { SelectionModel } from '@angular/cdk/collections';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, Observable, of, Subject, switchMap, take, tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConnectorParameters, SyncItem, ConnectorDefinition, ISourceConnector, SOURCE_ID_KEY } from '../sync/models';
import { SyncService } from '../sync/sync.service';
import { ConfirmFilesComponent } from './confirm-files/confirm-files.component';

@Component({
  selector: 'da-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent implements OnInit {
  step = 0;
  query = '';
  triggerSearch = new Subject<void>();
  sourceId = '';
  source?: ISourceConnector;
  resources: Observable<SyncItem[]> = this.triggerSearch.pipe(
    filter(() => !!this.source),
    switchMap(() => (this.source as ISourceConnector).getFiles(this.query)),
  );
  selection = new SelectionModel<SyncItem>(true, []);

  constructor(
    private sync: SyncService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.sourceId = localStorage.getItem(SOURCE_ID_KEY) || '';
    // useful for dev mode in browser (in Electron, as the page is not reloaded, authneticate is already waiting for an answer)
    if (this.sourceId && !this.source) {
      this.sync
        .getSource(this.sourceId)
        .pipe(take(1))
        .pipe(
          tap((source) => (this.source = source)),
          switchMap((source) => source.authenticate()),
          filter((yes) => yes),
        )
        .subscribe(() => {
          this.next();
          localStorage.removeItem(SOURCE_ID_KEY);
        });
    }
  }

  next() {
    this.step++;
    if (this.step === 1) {
      setTimeout(() => this.triggerSearch.next(), 200);
    }
    this.cdr.detectChanges();
  }

  selectSource(event: { connector: ConnectorDefinition; params?: ConnectorParameters }) {
    this.sourceId = event.connector.id;
    this.sync
      .getSource(event.connector.id)
      .pipe(
        take(1),
        switchMap((source) => {
          this.source = source;
          if (source.hasServerSideAuth) {
            localStorage.setItem(SOURCE_ID_KEY, event.connector.id);
            source.goToOAuth();
          }
          return this.source.authenticate();
        }),
        filter((yes) => yes),
      )
      .subscribe(() => this.next());
  }

  selectDestination(event: { connector: ConnectorDefinition; params?: ConnectorParameters }) {
    this.dialog
      .open(ConfirmFilesComponent, {
        data: { files: this.selection.selected },
      })
      .afterClosed()
      .pipe(filter((result) => !!result))
      .subscribe(() => {
        this.sync.addSync({
          date: new Date().toISOString(),
          source: this.sourceId,
          destination: {
            id: event.connector.id,
            params: event.params,
          },
          files: this.selection.selected,
        });
        this.router.navigate(['/']);
      });
  }

  search(query: string) {
    this.query = query;
    this.triggerSearch.next();
  }
}