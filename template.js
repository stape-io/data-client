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

const requestMethod = getRequestMethod();
const path = getRequestPath();
let isClientUsed = false;

if (path === '/data') {
    runClient();
}

if (path === '/data/store') {
    runClient();
}

if (data.path && !isClientUsed) {
    for (let key in data.path) {
        if (!isClientUsed && data.path[key].path === path) {
            runClient();
        }
    }
}

function runClient()
{
    isClientUsed = true;
    require('claimRequest')();

    if (requestMethod === 'OPTIONS') {
        setResponseHeaders();

        returnResponse();
    } else if (path === '/data/store') {
        storeCookies();
        setResponseHeaders();
        setPixelResponse();

        returnResponse();
    } else {
        let eventModel = {timestamp: makeInteger(getTimestampMillis()/1000)};

        eventModel = addQueryParametersToEventModel(eventModel);
        eventModel = addBodyParametersToEventModel(eventModel);
        eventModel = addRequiredParametersToEventModel(eventModel);
        eventModel = addDataTagParametersToEventModel(eventModel);
        eventModel = addCommonParametersToEventModel(eventModel);
        eventModel = addClientIdToEventModel(eventModel);
        storeClientId(eventModel);
        exposeFPIDCookie(eventModel);

        runContainer(eventModel, () => {
            setResponseHeaders();

            if (requestMethod === 'POST') {
                setResponseHeader('Content-Type', 'application/json');
                setResponseBody(JSON.stringify({
                    timestamp: eventModel.timestamp,
                }));
                returnResponse();
            } else {
                setPixelResponse();
                returnResponse();
            }
        });
    }
}

function addCommonParametersToEventModel(eventModel)
{
    let userData = {};
    let userAddressData = {};

    if (eventModel.user_data) userData = eventModel.user_data;
    if (userData.address) userAddressData = userData.address;

    if (!eventModel.ip_override) {
        if (eventModel.ip) eventModel.ip_override = eventModel.ip;
        else if (eventModel.ipOverride) eventModel.ip_override = eventModel.ipOverride;
        else eventModel.ip_override = getRemoteAddress();
    }

    if (!eventModel.user_agent) {
        if (eventModel.userAgent) eventModel.user_agent = eventModel.userAgent;
        else if (getRequestHeader('User-Agent')) eventModel.user_agent = getRequestHeader('User-Agent');
    }

    if (!eventModel.language) {
        const acceptLanguageHeader = getRequestHeader('Accept-Language');

        if (acceptLanguageHeader) {
            eventModel.language = acceptLanguageHeader.split(';')[0].substring(0,2).toLowerCase();
        }
    }

    if (!eventModel.page_hostname) {
        if (eventModel.pageHostname) eventModel.page_hostname = eventModel.pageHostname;
        else if (eventModel.hostname) eventModel.page_hostname = eventModel.hostname;
    }

    if (!eventModel.page_location) {
        if (eventModel.pageLocation) eventModel.page_location = eventModel.pageLocation;
        else if (eventModel.url) eventModel.page_location = eventModel.url;
        else if (eventModel.href) eventModel.page_location = eventModel.href;
    }

    if (!eventModel.page_referrer) {
        if (eventModel.pageReferrer) eventModel.page_referrer = eventModel.pageReferrer;
        else if (eventModel.referrer) eventModel.page_referrer = eventModel.referrer;
    }

    if (!userData.email_address) {
        if (eventModel.userEmail) userData.email_address = eventModel.userEmail;
        else if (eventModel.email_address) userData.email_address = eventModel.email_address;
        else if (eventModel.email) userData.email_address = eventModel.email;
        else if (eventModel.mail) userData.email_address = eventModel.mail;
    }

    if (!userData.phone_number) {
        if (eventModel.userPhoneNumber) userData.phone_number = eventModel.userPhoneNumber;
        else if (eventModel.phone_number) userData.phone_number = eventModel.phone_number;
        else if (eventModel.phoneNumber) userData.phone_number = eventModel.phoneNumber;
        else if (eventModel.phone) userData.phone_number = eventModel.phone;
    }

    if (!eventModel.page_encoding && eventModel.pageEncoding) eventModel.page_encoding = eventModel.pageEncoding;
    if (!eventModel.page_path && eventModel.pagePath) eventModel.page_path = eventModel.pagePath;
    if (!eventModel.page_title && eventModel.pageTitle) eventModel.page_title = eventModel.pageTitle;
    if (!eventModel.screen_resolution && eventModel.screenResolution) eventModel.screen_resolution = eventModel.screenResolution;
    if (!eventModel.viewport_size && eventModel.viewportSize) eventModel.viewport_size = eventModel.viewportSize;
    if (!eventModel.user_id && eventModel.userId) eventModel.user_id = eventModel.userId;
    if (!userAddressData.street && eventModel.street) userAddressData.street = eventModel.street;
    if (!userAddressData.city && eventModel.city) userAddressData.city = eventModel.city;
    if (!userAddressData.region && eventModel.region) userAddressData.region = eventModel.region;
    if (!userAddressData.country && eventModel.country) userAddressData.country = eventModel.country;

    if (!userAddressData.first_name) {
        if (eventModel.userFirstName) userAddressData.first_name = eventModel.userFirstName;
        else if (eventModel.first_name) userAddressData.first_name = eventModel.first_name;
        else if (eventModel.firstName) userAddressData.first_name = eventModel.firstName;
        else if (eventModel.name) userAddressData.first_name = eventModel.name;
    }

    if (!userAddressData.last_name) {
        if (eventModel.userLastName) userAddressData.last_name = eventModel.userLastName;
        else if (eventModel.last_name) userAddressData.last_name = eventModel.last_name;
        else if (eventModel.lastName) userAddressData.last_name = eventModel.lastName;
        else if (eventModel.surname) userAddressData.last_name = eventModel.surname;
        else if (eventModel.family_name) userAddressData.last_name = eventModel.family_name;
        else if (eventModel.familyName) userAddressData.last_name = eventModel.familyName;
    }

    if (!userAddressData.region) {
        if (eventModel.region) userAddressData.region = eventModel.region;
        else if (eventModel.state) userAddressData.region = eventModel.state;
    }

    if (!userAddressData.postal_code) {
        if (eventModel.postal_code) userAddressData.postal_code = eventModel.postal_code;
        else if (eventModel.postalCode) userAddressData.postal_code = eventModel.postalCode;
        else if (eventModel.zip) userAddressData.postal_code = eventModel.zip;
    }

    if (getObjectLength(userAddressData) !== 0) {
        userData.address = userAddressData;
    }

    if (getObjectLength(userData) !== 0) {
        eventModel.user_data = userData;
    }

    return eventModel;
}

function addQueryParametersToEventModel(eventModel)
{
    const requestQueryParameters = getRequestQueryParameters();

    if (requestQueryParameters) {
        for (let queryParameterKey in requestQueryParameters) {
            if (queryParameterKey === 'dtcd' && requestMethod === 'GET') {
                let dtcd = JSON.parse(requestQueryParameters[queryParameterKey]);

                for (let dtcdKey in dtcd) {
                    eventModel[dtcdKey] = dtcd[dtcdKey];
                }
            } else {
                eventModel[queryParameterKey] = requestQueryParameters[queryParameterKey];
            }
        }
    }

    return eventModel;
}

function addClientIdToEventModel(eventModel)
{
    if (eventModel.client_id) {
        return eventModel;
    }

    if (eventModel.data_client_id) {
        eventModel.client_id = eventModel.data_client_id;

        return eventModel;
    }

    if (eventModel._dcid) {
        eventModel.client_id = eventModel._dcid;

        return eventModel;
    }

    if (getCookieValues('_dcid') && getCookieValues('_dcid')[0]) {
        eventModel.client_id = getCookieValues('_dcid')[0];

        return eventModel;
    }

    if (data.generateClientId) {
        eventModel.client_id = 'dcid.1.' + getTimestampMillis() + '.' + generateRandom(100000000, 999999999);
    }

    return eventModel;
}

function addBodyParametersToEventModel(eventModel)
{
    const body = getRequestBody();

    if (body) {
        const bodyJson = JSON.parse(body);

        if (bodyJson) {
            for (let bodyKey in bodyJson) {
                if (bodyKey === 'important_cookie_values') {
                    eventModel = addImportantCookiesToEventModel(eventModel, bodyJson[bodyKey]);
                } else if (bodyKey === 'data_tag_custom_data') {
                    eventModel = addDataTagParametersToEventModel(eventModel, bodyJson[bodyKey]);
                } else {
                    eventModel[bodyKey] = bodyJson[bodyKey];
                }
            }
        }
    }

    return eventModel;
}

function addDataTagParametersToEventModel(eventModel, customData)
{
    for (let dataKey in customData) {
        eventModel[customData[dataKey].name] = customData[dataKey].value;
    }

    return eventModel;
}

function addImportantCookiesToEventModel(eventModel, customData)
{
    for (let dataKey in customData) {
        if (dataKey === '_fbp' || dataKey === '_fbc' || dataKey === '_dcid') {
            let value = customData[dataKey];

            if (value.length) {
                eventModel[dataKey] = value[0];
            }
        }
    }

    return eventModel;
}

function storeCookies()
{
    let dataToStore = JSON.parse(fromBase64(getRequestQueryParameters().d));

    for (let cookieName in dataToStore) {
        let cookieValue = dataToStore[cookieName];

        if (cookieValue.length) {
            setCookie('stape_'+cookieName, cookieValue, {
                domain: 'auto',
                path: '/',
                samesite: getCookieType({}),
                secure: true,
                'max-age': 63072000, // 2 years
                httpOnly: false
            });
        }
    }
}

function addRequiredParametersToEventModel(eventModel)
{
    if (!eventModel.event_name) {
        let eventName = 'Data';

        if (eventModel.eventName) eventName = eventModel.eventName;
        else if (eventModel.event) eventName = eventModel.event;

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
                httpOnly: false
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
            httpOnly: false
        });
    }
}

function getObjectLength(object) {
    let length = 0;
    for(let key in object) {
        if(object.hasOwnProperty(key)) {
            ++length;
        }
    }
    return length;
}

function setResponseHeaders() {
    setResponseHeader('Access-Control-Allow-Origin', getRequestHeader('origin'));
    setResponseHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    setResponseHeader('Access-Control-Allow-Headers', 'content-type,set-cookie,x-robots-tag,x-gtm-server-preview,x-stape-preview');
    setResponseHeader('Access-Control-Allow-Credentials', 'true');
    setResponseStatus(200);
}

function getCookieType(eventModel) {
    if (!eventModel.page_location) {
        return 'Lax';
    }

    const host = getRequestHeader('host');
    const effectiveTldPlusOne = computeEffectiveTldPlusOne(eventModel.page_location);

    if (!host || !effectiveTldPlusOne) {
        return 'Lax';
    }

    if (host && host.indexOf(effectiveTldPlusOne) !== -1) {
        return 'Lax';
    }

    return 'None';
}
