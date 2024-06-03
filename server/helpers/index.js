// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => ({
  route(name) {
    return app.reverse(name);
  },
  t(key) {
    return i18next.t(key);
  },
  routeTo(name, params) {
    return app.reverse(name, params);
  },
  _,
  getAlertClass(type) {
    switch (type) {
      // case 'failure':
      //   return 'danger';
      case 'error':
        return 'danger';
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      default:
        throw new Error(`Unknown flash type: '${type}'`);
    }
  },
  formatDate(str) {
    const date = new Date(str);
    return date.toLocaleString();
  },
  convertPropertyName(property) {
    const dict = {
      status: 'statusId',
      executor: 'executorId',
      labels: 'labels',
    };
    return dict[property];
  },
  queryObjToStr(queryObj) {
    if (_.isEmpty(queryObj)) return '';
    let str = ';';
    Object.entries(queryObj).forEach(([key, value]) => { str += `${key}=${value || ''}&`; });
    return str.slice(0, -1);
  },
});
