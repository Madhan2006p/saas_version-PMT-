import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);

mock.onGet(/\/workflow\/states\/content-type-id\//).reply((config) => {
  return [200, { matched: true, url: config.url }];
});

mock.onGet(/.*/).reply(200, { matched: false });

axios.get('/api/v1/workflow/states/content-type-id/?app_label=projects&model=project')
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
