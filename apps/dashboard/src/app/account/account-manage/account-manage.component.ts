import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, of } from 'rxjs';
import { switchMap, concatMap, takeUntil, tap, filter, distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { ZoneService, Zone } from '@flaps/core';
import { AccountModification, SDKService, StateService, STFTrackingService } from '@flaps/core';
import { Account } from '@nuclia/core';
import { TOPBAR_HEIGHT } from '../../styles/js-variables';
import { SectionInfo, Sluggable } from '@flaps/common';
import { IErrorMessages, ModalConfig } from '@guillotinaweb/pastanaga-angular';
import { NavigationService } from '../../services/navigation.service';
import { SisModalService, SisToastService } from '@nuclia/sistema';
import { AccountDeleteComponent } from './account-delete/account-delete.component';

type Section = 'account' | 'config' | 'knowledgeboxes' | 'users' | 'nucliaDBs';

const SECTION_TITLES: { [section in Section]: string } = {
  account: 'account.manage',
  config: 'generic.settings',
  knowledgeboxes: 'account.knowledgeboxes',
  users: 'account.users',
  nucliaDBs: 'account.nua_keys',
};

@Component({
  selector: 'app-account-manage',
  templateUrl: './account-manage.component.html',
  styleUrls: ['./account-manage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountManageComponent implements OnInit, AfterViewInit, OnDestroy {
  unsubscribeAll = new Subject<void>();
  sectionsInfo: SectionInfo[] = [];
  topbarHeight = parseInt(TOPBAR_HEIGHT, 10);
  account: Account | undefined;
  @ViewChildren('section') sections: QueryList<ElementRef> | undefined;

  accountForm = this.formBuilder.group({
    title: ['', [Sluggable()]],
    description: [''],
  });

  validationMessages = {
    title: {
      sluggable: 'account.account_name_invalid',
    } as IErrorMessages,
  };

  isUsersEnabled = this.tracking.isFeatureEnabled('manage-users').pipe(shareReplay(1));

  zones: Zone[] | undefined;
  zone = new UntypedFormControl();
  speechToText: boolean = false;
  initialValues = { title: '', description: '' };

  constructor(
    private stateService: StateService,
    private formBuilder: UntypedFormBuilder,
    private zoneService: ZoneService,
    private sdk: SDKService,
    private cdr: ChangeDetectorRef,
    private tracking: STFTrackingService,
    private router: Router,
    private navigation: NavigationService,
    private modalService: SisModalService,
    private toaster: SisToastService,
  ) {}

  ngOnInit(): void {
    this.stateService.account
      .pipe(
        filter((account): account is Account => !!account),
        tap((account) => {
          this.account = account;
          this.initialValues.title = account.title;
          this.initialValues.description = account.description || '';
        }),
        switchMap(() => this.initZones()),
        takeUntil(this.unsubscribeAll),
      )
      .subscribe(() => {
        this.speechToText = !!this.account!.config?.g_speech_to_text;
        this.initAccountForm();
        this.cdr?.markForCheck();
      });

    this.zone.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeAll))
      .subscribe((zone) => this.saveZone(zone));
  }

  ngAfterViewInit(): void {
    this.sections?.changes.pipe(takeUntil(this.unsubscribeAll)).subscribe(() => {
      this.updateSectionInfo();
    });
    setTimeout(() => {
      this.updateSectionInfo();
    }, 10);
  }

  initAccountForm(): void {
    this.accountForm.reset(this.initialValues);
  }

  initZones(): Observable<void> {
    return this.zoneService.getZones().pipe(
      map((zones) => {
        this.zones = zones;
        this.zone.patchValue(this.account!.zone, { emitEvent: false });
      }),
    );
  }

  updateSectionInfo(): void {
    this.sectionsInfo = this.sections!.toArray().map((section: ElementRef) => {
      const id = (section.nativeElement.getAttribute('id') || '') as Section;
      const title = SECTION_TITLES[id];
      return {
        title: title,
        element: section,
      };
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribeAll) {
      this.unsubscribeAll.next();
      this.unsubscribeAll.complete();
    }
  }

  saveAccount() {
    if (this.accountForm.invalid) return;
    const data: AccountModification = {
      title: this.accountForm.value.title,
      description: this.accountForm.value.description,
    };

    this.sdk.nuclia.db
      .modifyAccount(this.account!.slug, data)
      .pipe(
        concatMap(() => this.sdk.nuclia.db.getAccount(this.account!.slug)),
        takeUntil(this.unsubscribeAll),
      )
      .subscribe((account) => {
        this.stateService.setAccount(account);
      });
  }

  saveZone(value: string) {
    //TODO: missing field "zone" in AccountModification
  }

  deleteAccount() {
    this.sdk.nuclia.db
      .getWelcome()
      .pipe(
        map(
          (welcome) => welcome.dependant_accounts.length === 1 && welcome.dependant_accounts[0].id === this.account!.id,
        ),
        switchMap(
          (showDeleteUser) =>
            this.modalService.openModal(
              AccountDeleteComponent,
              new ModalConfig<{ showDeleteUser: boolean }>({ data: { showDeleteUser } }),
            ).onClose,
        ),
        filter((result) => !!result),
        switchMap((result) =>
          this.sdk.nuclia.db.deleteAccount(this.account!.slug).pipe(
            switchMap(() => (result.deleteUser ? this.sdk.nuclia.auth.deleteAuthenticatedUser() : of(undefined))),
            map(() => result.deleteUser),
          ),
        ),
      )
      .subscribe({
        next: (deleteUser) => {
          this.stateService.cleanAccount();
          if (deleteUser) {
            this.router.navigate(['/setup/farewell']);
          } else {
            this.router.navigate([this.navigation.getAccountSelectUrl()]);
          }
        },
        error: () => {
          this.toaster.error('account.delete.error');
        },
      });
  }
}
