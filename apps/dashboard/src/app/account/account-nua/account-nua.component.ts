import { ChangeDetectionStrategy, Component } from '@angular/core';
import { filter, map, Subject, switchMap, take, takeUntil } from 'rxjs';
import { NUAClient } from '@nuclia/core';
import { AccountNUAService } from './account-nua.service';
import { ClientDialogComponent, ClientDialogData } from './client-dialog/client-dialog.component';
import { Router } from '@angular/router';
import { StateService, STFTrackingService } from '@flaps/core';
import { SisModalService } from '@nuclia/sistema';
import { NavigationService, TokenDialogComponent } from '@flaps/common';

@Component({
  selector: 'app-account-nua',
  templateUrl: './account-nua.component.html',
  styleUrls: ['./account-nua.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNUAComponent {
  clients = this.nua.clients;
  unsubscribeAll = new Subject<void>();

  isNuaActivityEnabled = this.tracking.isFeatureEnabled('view-nua-activity');

  constructor(
    private nua: AccountNUAService,
    private router: Router,
    private stateService: StateService,
    private navigation: NavigationService,
    private tracking: STFTrackingService,
    private modalService: SisModalService,
  ) {
    this.nua.updateClients();
  }

  askConfirmation(client: NUAClient): void {
    this.modalService
      .openConfirm({
        title: 'account.generate_key',
        description: 'account.token_generation_warning',
      })
      .onClose.pipe(
        filter((confirm) => !!confirm),
        switchMap(() => this.nua.renewClient(client.client_id)),
        takeUntil(this.unsubscribeAll),
      )
      .subscribe(({ token }) => {
        this.showToken(token);
        this.nua.updateClients();
      });
  }

  goToActivity(client: NUAClient): void {
    this.isNuaActivityEnabled
      .pipe(
        take(1),
        filter((enabled) => enabled),
        switchMap(() => this.stateService.account),
        filter((account) => !!account),
        take(1),
        map((account) => this.navigation.getAccountUrl(account!.slug)),
      )
      .subscribe((accountUrl) => this.router.navigateByUrl(`${accountUrl}/manage/nua/${client.client_id}/activity`));
  }

  showToken(token: string) {
    this.modalService.openModal(TokenDialogComponent, {
      dismissable: true,
      data: {
        token: token,
      },
    });
  }

  openDialog(client?: NUAClient) {
    const data: ClientDialogData = { client };
    this.modalService
      .openModal(ClientDialogComponent, {
        dismissable: true,
        data,
      })
      .onClose.pipe(
        takeUntil(this.unsubscribeAll),
        filter((result) => typeof result === 'string'),
      )
      .subscribe((token) => {
        this.showToken(token);
        this.nua.updateClients();
      });
  }

  deleteClient(id: string) {
    this.modalService
      .openConfirm({
        title: 'account.nua_key_delete',
        description: 'account.nua_key_delete_warning',
        confirmLabel: 'generic.delete',
        isDestructive: true,
      })
      .onClose.pipe(
        filter((confirm) => !!confirm),
        switchMap(() => this.nua.deleteClient(id)),
      )
      .subscribe(() => {
        this.nua.updateClients();
      });
  }
}
