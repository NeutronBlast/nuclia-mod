import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SDKService } from '@flaps/core';
import { Account, IKnowledgeBoxItem } from '@nuclia/core';

export type AccountsKbs = { [account: string]: IKnowledgeBoxItem[] };

// This service is provided in the root, but is only intended to be used inside Select component.
@Injectable({
  providedIn: 'root',
})
export class SelectAccountKbService {
  private readonly accountsSubject = new BehaviorSubject<Account[] | null>(null);
  readonly accounts = this.accountsSubject.asObservable();

  private readonly kbsSubject = new BehaviorSubject<AccountsKbs | null>(null);

  constructor(private sdk: SDKService) {}

  getAccounts(): Account[] | null {
    return this.accountsSubject.getValue();
  }

  getKbs(): AccountsKbs | null {
    return this.kbsSubject.getValue();
  }

  refresh(): Observable<{ accounts: Account[]; kbs: AccountsKbs }> {
    let accounts: Account[];
    return this.sdk.nuclia.db.getAccounts().pipe(
      tap((acc) => (accounts = acc)),
      switchMap((acc) =>
        acc.length === 0 ? of([]) : forkJoin(acc.map((account) => this.sdk.nuclia.db.getKnowledgeBoxes(account.slug))),
      ),
      switchMap((allKbs: IKnowledgeBoxItem[][]) => {
        const accountKbs: AccountsKbs = {};
        allKbs.forEach((kbs, index) => {
          const account = accounts[index];
          return (accountKbs[account.slug] = kbs);
        });

        this.accountsSubject.next(accounts);
        this.kbsSubject.next(accountKbs);
        return of({
          accounts: accounts,
          kbs: accountKbs,
        });
      }),
    );
  }
}
