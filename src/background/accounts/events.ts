import mitt from 'mitt';

type AccountsEvents = {
  accountsChanged: void;
  accountStatusChanged: { accountID: string };
  activeAccountChanged: { accountID: string };
};

export const accountsEvents = mitt<AccountsEvents>();
