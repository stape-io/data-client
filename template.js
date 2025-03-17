const returnResponse = require('returnResponse');
const runContainer = require('runContainer');
const setResponseHeader = require('setResponseHeader');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const JSON = require('JSON');
const fromBase64 = require('fromBase64');
const getTimestampMillis = require('getTimestampMillis');
const getCookieValues = require('getCookieValues');
const getRequestBody = require('getRequestBody');
const getRequestMethod = require('getRequestMethod');
const getRequestHeader = require('getRequestHeader');
const getRequestPath = require('getRequestPath');
const getRequestQueryParameters = require('getRequestQueryParameters');
const makeInteger = require('makeInteger');
const getRemoteAddress = require('getRemoteAddress');
const setCookie = require('setCookie');
const setPixelResponse = require('setPixelResponse');
const generateRandom = require('generateRandom');
const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const getRequestQueryParameter = require('getRequestQueryParameter');
const getType = require('getType');
const Promise = require('Promise');
const decodeUriComponent = require('decodeUriComponent');
const createRegex = require('createRegex');
const makeString = require('makeString');

const requestMethod = getRequestMethod();
const path = getRequestPath();
let isClientUsed = false;
let isEventModelsWrappedInArray = false;

if (path === '/data') {
  runClient();
}

if (data.path && !isClientUsed) {
  for (let key in data.path) {
    if (!isClientUsed && data.path[key].path === path) {
      runClient();
    }
  }
}

function runClient() {
  isClientUsed = true;
  require('claimRequest')();

  if (requestMethod === 'OPTIONS') {
    setCommonResponseHeaders(200);
    returnResponse();
    return;
  }
  const baseEventModel = getBaseEventModelWithQueryParameters();
  let eventModels = getEventModels(baseEventModel);
  const clientId = getClientId(eventModels);
  eventModels = eventModels.map((eventModel) => {
    eventModel = addRequiredParametersToEventModel(eventModel);
    eventModel = addCommonParametersToEventModel(eventModel);
    eventModel = addClientIdToEventModel(eventModel, clientId);
    return eventModel;
  });

  storeClientId(eventModels[0]);
  exposeFPIDCookie(eventModels[0]);
  prolongDataTagCookies(eventModels[0]);
  const responseStatusCode = makeInteger(data.responseStatusCode);
  setCommonResponseHeaders(responseStatusCode);

  Promise.all(
    eventModels.map((eventModel) => {
      return Promise.create((resolve) => {
        runContainer(eventModel, resolve);
      });
    })
  ).then(() => {
    switch (responseStatusCode) {
      case 200:
      case 201:
        if (requestMethod === 'POST' || data.responseBodyGet) {
          prepareResponseBody(eventModels);
        } else {
          setPixelResponse();
        }
        break;
      case 301:
      case 302:
        setRedirectLocation();
        break;
      case 403:
      case 404:
        setClientErrorResponseMessage();
        break;
    }

    returnResponse();
  });
}

function addCommonParametersToEventModel(eventModel) {
  if (!eventModel.ip_override) {
    if (eventModel.ip) eventModel.ip_override = eventModel.ip;
    else if (eventModel.ipOverride)
      eventModel.ip_override = eventModel.ipOverride;
    else eventModel.ip_override = getRemoteAddress();
  }

  if (!eventModel.user_agent) {
    if (eventModel.userAgent) eventModel.user_agent = eventModel.userAgent;
    else if (getRequestHeader('User-Agent'))
      eventModel.user_agent = getRequestHeader('User-Agent');
  }

  if (!eventModel.language) {
    const acceptLanguageHeader = getRequestHeader('Accept-Language');

    if (acceptLanguageHeader) {
      eventModel.language = acceptLanguageHeader
        .split(';')[0]
        .substring(0, 2)
        .toLowerCase();
    }
  }

  if (!eventModel.page_hostname) {
    if (eventModel.pageHostname)
      eventModel.page_hostname = eventModel.pageHostname;
    else if (eventModel.hostname)
      eventModel.page_hostname = eventModel.hostname;
  }

  if (!eventModel.page_location) {
    if (eventModel.pageLocation)
      eventModel.page_location = eventModel.pageLocation;
    else if (eventModel.url) eventModel.page_location = eventModel.url;
    else if (eventModel.href) eventModel.page_location = eventModel.href;
  }

  if (!eventModel.page_referrer) {
    if (eventModel.pageReferrer)
      eventModel.page_referrer = eventModel.pageReferrer;
    else if (eventModel.referrer)
      eventModel.page_referrer = eventModel.referrer;
    else if (eventModel.urlref) eventModel.page_referrer = eventModel.urlref;
  }

  if (!eventModel.value && eventModel.e_v) eventModel.value = eventModel.e_v;

  if (getType(eventModel.items) === 'array' && eventModel.items.length) {
    const firstItem = eventModel.items[0];
    if (!eventModel.currency && firstItem.currency)
      eventModel.currency = firstItem.currency;
    if (eventModel.items.length === 1) {
      if (!eventModel.item_id && firstItem.item_id)
        eventModel.item_id = firstItem.item_id;
      if (!eventModel.item_name && firstItem.item_name)
        eventModel.item_name = firstItem.item_name;
      if (!eventModel.item_brand && firstItem.item_brand)
        eventModel.item_brand = firstItem.item_brand;
      if (!eventModel.item_quantity && firstItem.quantity)
        eventModel.item_quantity = firstItem.quantity;
      if (!eventModel.item_category && firstItem.item_category)
        eventModel.item_category = firstItem.item_category;
      if (!eventModel.item_price && firstItem.price)
        eventModel.item_price = firstItem.price;
    }
    if (!eventModel.value) {
      const valueFromItems = eventModel.items.reduce((acc, item) => {
        if (!item.price) return acc;
        const quantity = item.quantity ? item.quantity : 1;
        return acc + quantity * item.price;
      }, 0);
      if (valueFromItems) eventModel.value = valueFromItems;
    }
  }

  const ecommerceAction = getEcommerceAction(eventModel);

  if (ecommerceAction) {
    if (!eventModel['x-ga-mp1-pa']) eventModel['x-ga-mp1-pa'] = ecommerceAction;

    if (
      ecommerceAction === 'purchase' &&
      eventModel.ecommerce.purchase.actionField
    ) {
      if (!eventModel['x-ga-mp1-tr'])
        eventModel['x-ga-mp1-tr'] =
          eventModel.ecommerce.purchase.actionField.revenue;
      if (!eventModel.revenue)
        eventModel.revenue = eventModel.ecommerce.purchase.actionField.revenue;
      if (!eventModel.affiliation)
        eventModel.affiliation =
          eventModel.ecommerce.purchase.actionField.affiliation;
      if (!eventModel.tax)
        eventModel.tax = eventModel.ecommerce.purchase.actionField.tax;
      if (!eventModel.shipping)
        eventModel.shipping =
          eventModel.ecommerce.purchase.actionField.shipping;
      if (!eventModel.coupon)
        eventModel.coupon = eventModel.ecommerce.purchase.actionField.coupon;
      if (!eventModel.transaction_id)
        eventModel.transaction_id =
          eventModel.ecommerce.purchase.actionField.id;
    }
  }

  if (!eventModel.page_encoding && eventModel.pageEncoding)
    eventModel.page_encoding = eventModel.pageEncoding;
  if (!eventModel.page_path && eventModel.pagePath)
    eventModel.page_path = eventModel.pagePath;
  if (!eventModel.page_title && eventModel.pageTitle)
    eventModel.page_title = eventModel.pageTitle;
  if (!eventModel.screen_resolution && eventModel.screenResolution)
    eventModel.screen_resolution = eventModel.screenResolution;
  if (!eventModel.viewport_size && eventModel.viewportSize)
    eventModel.viewport_size = eventModel.viewportSize;
  if (!eventModel.user_id && eventModel.userId)
    eventModel.user_id = eventModel.userId;

  if (!eventModel.user_data) {
    let userData = {};
    let userAddressData = {};

    if (!userData.email_address) {
      if (eventModel.userEmail) userData.email_address = eventModel.userEmail;
      else if (eventModel.email_address)
        userData.email_address = eventModel.email_address;
      else if (eventModel.email) userData.email_address = eventModel.email;
      else if (eventModel.mail) userData.email_address = eventModel.mail;
    }

    if (!userData.phone_number) {
      if (eventModel.userPhoneNumber)
        userData.phone_number = eventModel.userPhoneNumber;
      else if (eventModel.phone_number)
        userData.phone_number = eventModel.phone_number;
      else if (eventModel.phoneNumber)
        userData.phone_number = eventModel.phoneNumber;
      else if (eventModel.phone) userData.phone_number = eventModel.phone;
    }

    if (!userAddressData.street && eventModel.street)
      userAddressData.street = eventModel.street;
    if (!userAddressData.city && eventModel.city)
      userAddressData.city = eventModel.city;
    if (!userAddressData.region && eventModel.region)
      userAddressData.region = eventModel.region;
    if (!userAddressData.country && eventModel.country)
      userAddressData.country = eventModel.country;

    if (!userAddressData.first_name) {
      if (eventModel.userFirstName)
        userAddressData.first_name = eventModel.userFirstName;
      else if (eventModel.first_name)
        userAddressData.first_name = eventModel.first_name;
      else if (eventModel.firstName)
        userAddressData.first_name = eventModel.firstName;
      else if (eventModel.name) userAddressData.first_name = eventModel.name;
    }

    if (!userAddressData.last_name) {
      if (eventModel.userLastName)
        userAddressData.last_name = eventModel.userLastName;
      else if (eventModel.last_name)
        userAddressData.last_name = eventModel.last_name;
      else if (eventModel.lastName)
        userAddressData.last_name = eventModel.lastName;
      else if (eventModel.surname)
        userAddressData.last_name = eventModel.surname;
      else if (eventModel.family_name)
        userAddressData.last_name = eventModel.family_name;
      else if (eventModel.familyName)
        userAddressData.last_name = eventModel.familyName;
    }

    if (!userAddressData.region) {
      if (eventModel.region) userAddressData.region = eventModel.region;
      else if (eventModel.state) userAddressData.region = eventModel.state;
    }

    if (!userAddressData.postal_code) {
      if (eventModel.postal_code)
        userAddressData.postal_code = eventModel.postal_code;
      else if (eventModel.postalCode)
        userAddressData.postal_code = eventModel.postalCode;
      else if (eventModel.zip) userAddressData.postal_code = eventModel.zip;
    }

    if (getObjectLength(userAddressData) !== 0) {
      userData.address = userAddressData;
    }

    if (!eventModel.user_data && getObjectLength(userData) !== 0) {
      eventModel.user_data = userData;
    }
  }

  return eventModel;
}

function getBaseEventModelWithQueryParameters() {
  const requestQueryParameters = getRequestQueryParameters();
  const eventModel = {};

  if (requestQueryParameters) {
    for (let queryParameterKey in requestQueryParameters) {
      if (
        (queryParameterKey === 'dtcd' || queryParameterKey === 'dtdc') &&
        requestMethod === 'GET'
      ) {
        let dt =
          queryParameterKey === 'dtcd'
            ? JSON.parse(requestQueryParameters[queryParameterKey])
            : JSON.parse(fromBase64(requestQueryParameters[queryParameterKey]));

        for (let dtKey in dt) {
          eventModel[dtKey] = dt[dtKey];
        }
      } else {
        eventModel[queryParameterKey] =
          requestQueryParameters[queryParameterKey];
      }
    }
  }

  return eventModel;
}

function addClientIdToEventModel(eventModel, clientId) {
  eventModel.client_id = clientId;
  return eventModel;
}

function prolongDataTagCookies(eventModel) {
  if (data.prolongCookies) {
    let stapeData = getCookieValues('stape');

    if (stapeData.length) {
      setCookie('stape', stapeData[0], {
        domain: 'auto',
        path: '/',
        samesite: getCookieType(eventModel),
        secure: true,
        'max-age': 63072000, // 2 years
        httpOnly: false,
      });
    }
  }
}

function addRequiredParametersToEventModel(eventModel) {
  if (!eventModel.event_name) {
    let eventName = 'Data';

    if (eventModel.eventName) eventName = eventModel.eventName;
    else if (eventModel.event) eventName = eventModel.event;
    else if (eventModel.e_n) eventName = eventModel.e_n;

    eventModel.event_name = eventName;
  }

  return eventModel;
}

function exposeFPIDCookie(eventModel) {
  if (data.exposeFPIDCookie) {
    let fpid = getCookieValues('FPID');

    if (fpid.length) {
      setCookie('FPIDP', fpid[0], {
        domain: 'auto',
        path: '/',
        samesite: getCookieType(eventModel),
        secure: true,
        'max-age': 63072000, // 2 years
        httpOnly: false,
      });
    }
  }
}

function storeClientId(eventModel) {
  if (data.generateClientId) {
    setCookie('_dcid', eventModel.client_id, {
      domain: 'auto',
      path: '/',
      samesite: getCookieType(eventModel),
      secure: true,
      'max-age': 63072000, // 2 years
      httpOnly: data.httpOnlyCookie || false
    });
  }
}

function getObjectLength(object) {
  let length = 0;

  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      ++length;
    }
  }
  return length;
}

function setCommonResponseHeaders(statusCode) {
  setResponseHeader('Access-Control-Max-Age', '600');
  setResponseHeader('Access-Control-Allow-Origin', getRequestHeader('origin'));
  setResponseHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  setResponseHeader(
    'Access-Control-Allow-Headers',
    'content-type,set-cookie,x-robots-tag,x-gtm-server-preview,x-stape-preview'
  );
  setResponseHeader('Access-Control-Allow-Credentials', 'true');
  setResponseStatus(statusCode);
}

function getCookieType(eventModel) {
  if (!eventModel.page_location) {
    return 'Lax';
  }

  const host = getRequestHeader('host');
  const effectiveTldPlusOne = computeEffectiveTldPlusOne(
    eventModel.page_location
  );

  if (!host || !effectiveTldPlusOne) {
    return 'Lax';
  }

  if (host && host.indexOf(effectiveTldPlusOne) !== -1) {
    return 'Lax';
  }

  return 'None';
}

function prepareResponseBody(eventModels) {
  if (data.responseBody === 'empty') {
    return;
  }

  const responseModel = isEventModelsWrappedInArray
    ? eventModels[0]
    : eventModels;

  setResponseHeader('Content-Type', 'application/json');

  if (data.responseBody === 'eventData') {
    setResponseBody(JSON.stringify(responseModel));

    return;
  }

  if (isEventModelsWrappedInArray) {
    setResponseBody(
      JSON.stringify({
        timestamp: responseModel.timestamp,
        unique_event_id: responseModel.unique_event_id,
      })
    );
    return;
  }

  setResponseBody(
    JSON.stringify(
      eventModels.map((eventModel) => {
        return {
          timestamp: eventModel.timestamp,
          unique_event_id: eventModel.unique_event_id,
        };
      })
    )
  );
}

function getEcommerceAction(eventModel) {
  if (eventModel.ecommerce) {
    const actions = [
      'detail',
      'click',
      'add',
      'remove',
      'checkout',
      'checkout_option',
      'purchase',
      'refund',
    ];

    for (let index = 0; index < actions.length; ++index) {
      const action = actions[index];

      if (eventModel.ecommerce[action]) {
        return action;
      }
    }
  }

  return null;
}

function setRedirectLocation() {
  let location = data.redirectTo;
  if (data.lookupForRedirectToParam && data.redirectToQueryParamName) {
    const param = getRequestQueryParameter(data.redirectToQueryParamName);
    if (param && param.startsWith('http')) {
      location = param;
    }
  }
  setResponseHeader('location', location);
}

function setClientErrorResponseMessage() {
  if (data.clientErrorResponseMessage) {
    setResponseBody(data.clientErrorResponseMessage);
  }
}

function getEventModels(baseEventModel) {
  const body = getRequestBody();

  if (body) {
    const contentType = getRequestHeader('content-type');
    const isFormUrlEncoded =
      !!contentType &&
      contentType.indexOf('application/x-www-form-urlencoded') !== -1;
    let bodyJson = isFormUrlEncoded ? parseUrlEncoded(body) : JSON.parse(body);
    if (bodyJson) {
      const bodyType = getType(bodyJson);
      const shouldUseOriginalBody =
        data.acceptMultipleEvents && bodyType === 'array';
      if (!shouldUseOriginalBody) {
        bodyJson = [bodyJson];
        isEventModelsWrappedInArray = true;
      }

      return bodyJson.map((bodyItem) => {
        const eventModel = assign({}, baseEventModel, {
          timestamp: makeInteger(getTimestampMillis() / 1000),
          unique_event_id:
            getTimestampMillis() + '_' + generateRandom(100000000, 999999999),
        });
        for (let bodyItemKey in bodyItem) {
          eventModel[bodyItemKey] = bodyItem[bodyItemKey];
        }
        return eventModel;
      });
    }
  }

  return [
    assign({}, baseEventModel, {
      timestamp: makeInteger(getTimestampMillis() / 1000),
      unique_event_id:
        getTimestampMillis() + '_' + generateRandom(100000000, 999999999),
    }),
  ];
}

function getClientId(eventModels) {
  for (let i = 0; i < eventModels.length; i++) {
    const eventModel = eventModels[i];
    const clientId =
      eventModel.client_id || eventModel.data_client_id || eventModel._dcid;
    if (clientId) return clientId;
  }

  const dcid = getCookieValues('_dcid');
  if (dcid && dcid[0]) return dcid[0];

  if (data.generateClientId) {
    return (
      'dcid.1.' +
      getTimestampMillis() +
      '.' +
      generateRandom(100000000, 999999999)
    );
  }
  return '';
}

function assign() {
  const target = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    for (let key in arguments[i]) {
      target[key] = arguments[i][key];
    }
  }
  return target;
}

function parseUrlEncoded(data) {
  const pairs = data.split('&');
  const parsedData = {};
  const regex = createRegex('\\+', 'g');
  for (const pair of pairs) {
    const pairValue = pair.split('=');
    const key = pairValue[0];
    const value = pairValue[1];
    const keys = key
      .split('.')
      .map((k) => decodeUriComponent(k.replace(regex, ' ')));

    let currentObject = parsedData;

    for (let i = 0; i < keys.length - 1; i++) {
      const currentKey = keys[i];

      if (!currentObject[currentKey]) {
        const nextKey = keys[i + 1];
        const nextKeyIsNumber = makeString(makeInteger(nextKey)) === nextKey;
        currentObject[currentKey] = nextKeyIsNumber ? [] : {};
      }

      currentObject = currentObject[currentKey];
    }

    const lastKey = keys[keys.length - 1];
    const decodedValue = decodeUriComponent(value.replace(regex, ' '));
    const parsedValue = JSON.parse(decodedValue) || decodedValue;

    if (getType(currentObject) === 'array') {
      currentObject.push(parsedValue);
    } else {
      currentObject[lastKey] = parsedValue;
    }
  }

  return parsedData;
}