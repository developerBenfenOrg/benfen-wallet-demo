import mitt from 'mitt';

type AccountSourcesEvents = {
  accountSourcesChanged: void;
  accountSourceStatusUpdated: { accountSourceID: string };
};

export const accountSourcesEvents = mitt<AccountSourcesEvents>();
