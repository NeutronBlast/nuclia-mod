import { Injectable } from '@angular/core';
import { AccountService as GlobalAccountService, AccountTypeDefaults, SDKService } from '@flaps/core';
import { map, Observable } from 'rxjs';
import {
  AccountPatchPayload,
  AccountSummary,
  AccountUserType,
  BlockedFeature,
  BlockedFeaturesPayload,
  ExtendedAccount,
  KbRoles,
  KbSummary,
} from './account.models';
import { AccountBlockingState, AccountTypes } from '@nuclia/core';

const ACCOUNTS_ENDPOINT = '/manage/@accounts';
const ACCOUNT_ENDPOINT = '/manage/@account';
const KB_ENDPOINT = '@stashes';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private _accountTypes = this.globalAccount.getAccountTypes();

  constructor(private sdk: SDKService, private globalAccount: GlobalAccountService) {}

  getDefaultLimits(accountType: AccountTypes): Observable<AccountTypeDefaults> {
    return this._accountTypes.pipe(map((accountTypes) => accountTypes[accountType]));
  }

  getAccounts(): Observable<AccountSummary[]> {
    return this.sdk.nuclia.rest.get<AccountSummary[]>(ACCOUNTS_ENDPOINT);
  }

  getAccount(id: string): Observable<ExtendedAccount> {
    return this.sdk.nuclia.rest.get<ExtendedAccount>(`${ACCOUNT_ENDPOINT}/${id}`);
  }

  updateAccount(id: string, data: AccountPatchPayload): Observable<void> {
    return this.sdk.nuclia.rest.patch(`${ACCOUNT_ENDPOINT}/${id}`, data);
  }

  deleteAccount(id: string): Observable<void> {
    return this.sdk.nuclia.rest.delete(`${ACCOUNT_ENDPOINT}/${id}`);
  }

  updateBlockedFeatures(
    id: string,
    formValue: {
      generative: boolean;
      search: boolean;
      upload: boolean;
      processing: boolean;
    },
  ): Observable<void> {
    const blockedFeatures = Object.entries(formValue).reduce((blockedFeatures, [feature, blocked]) => {
      if (blocked) {
        blockedFeatures.push(feature as BlockedFeature);
      }
      return blockedFeatures;
    }, [] as BlockedFeature[]);
    const payload: BlockedFeaturesPayload = {
      blocking_state: blockedFeatures.length > 0 ? AccountBlockingState.MANAGER : AccountBlockingState.UNBLOCKED,
      blocked_features: blockedFeatures,
    };
    return this.sdk.nuclia.rest.patch(`${ACCOUNT_ENDPOINT}/${id}/blocking_status`, payload);
  }

  addAccountUser(accountId: string, userId: string): Observable<void> {
    return this.sdk.nuclia.rest.post(`${ACCOUNT_ENDPOINT}/${accountId}`, { id: userId });
  }

  updateAccountUserType(accountId: string, userId: string, newType: AccountUserType): Observable<void> {
    return this.sdk.nuclia.rest.patch(`${ACCOUNT_ENDPOINT}/${accountId}/${userId}`, { type: newType });
  }

  removeAccountUser(accountId: string, userId: string): Observable<void> {
    return this.sdk.nuclia.rest.delete(`${ACCOUNT_ENDPOINT}/${accountId}/${userId}`);
  }

  getKb(accountId: string, kbId: string): Observable<KbSummary> {
    return this.sdk.nuclia.rest.get(`${ACCOUNT_ENDPOINT}/${accountId}/${KB_ENDPOINT}/${kbId}`);
  }

  updateKb(accountId: string, kbId: string, data: { slug?: string; title?: string }): Observable<void> {
    return this.sdk.nuclia.rest.patch(`${ACCOUNT_ENDPOINT}/${accountId}/${KB_ENDPOINT}/${kbId}`, data);
  }

  updateKbUser(accountId: string, kbId: string, userId: string, newRole: KbRoles): Observable<void> {
    return this.sdk.nuclia.rest.patch(`${ACCOUNT_ENDPOINT}/${accountId}/${KB_ENDPOINT}/${kbId}/${userId}`, {
      role: newRole,
    });
  }

  addKbUser(accountId: string, kbId: string, userId: string): Observable<void> {
    return this.sdk.nuclia.rest.post(`${ACCOUNT_ENDPOINT}/${accountId}/${KB_ENDPOINT}/${kbId}`, {
      user: userId,
      stash: kbId,
    });
  }

  removeKbUser(accountId: string, kbId: string, userId: string): Observable<void> {
    return this.sdk.nuclia.rest.delete(`${ACCOUNT_ENDPOINT}/${accountId}/${KB_ENDPOINT}/${kbId}/${userId}`);
  }
}
