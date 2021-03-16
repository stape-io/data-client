const returnResponse = require('returnResponse');
const runContainer = require('runContainer');
const setResponseHeader = require('setResponseHeader');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const JSON = require('JSON');
const generateRandom = require('generateRandom');
const getTimestampMillis = require('getTimestampMillis');
const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const getCookieValues = require('getCookieValues');
const getRequestBody = require('getRequestBody');
const getRequestMethod = require('getRequestMethod');
const getRequestHeader = require('getRequestHeader');
const getRequestPath = require('getRequestPath');
const getRequestQueryParameters = require('getRequestQueryParameters');
const getRequestQueryString = require('getRequestQueryString');
const makeInteger = require('makeInteger');
const getRemoteAddress = require('getRemoteAddress');
const setCookie = require('setCookie');

const path = getRequestPath();
let isClientUsed = false;

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

function runClient()
{
    isClientUsed = true;
    require('claimRequest')();

    let eventModel = {
        timestamp: makeInteger(getTimestampMillis()/1000),
        request_data: {
            body: getBody(),
            path: getRequestPath(),
            method: getRequestMethod(),
            domain: getDomain(),
            domain_effective_tld_plus_one: getDomainEffectiveTldPlusOne(),
            query_string: getRequestQueryString(),
            query_parameters: getRequestQueryParameters(),
            cookies: getKnownCookies(),
            headers: getKnownHeaders(),
        },
    };

    eventModel.client_id = getDtclid(eventModel);

    eventModel = addQueryParametersToEventModel(eventModel);
    eventModel = addBodyParametersToEventModel(eventModel);
    eventModel = addDataTagParametersToEventModel(eventModel);
    eventModel = addRequiredParametersToEventModel(eventModel);
    eventModel = addCommonParametersToEventModel(eventModel);

    runContainer(eventModel, () => {
        setCookie('_dtclid', eventModel.client_id, {
            domain: 'auto',
            path: '/',
            'max-age': 63072000, // 2 years
            samesite: 'Lax',
            secure: true
        });

        setResponseHeader('Access-Control-Allow-Origin', getRequestHeader('origin'));
        setResponseHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
        setResponseHeader('Access-Control-Allow-Headers', 'content-type,set-cookie,x-robots-tag,x-gtm-server-preview');
        setResponseHeader('Access-Control-Allow-Credentials', 'true');

        setResponseStatus(200);
        setResponseHeader('Content-Type', 'application/json');
        setResponseBody(JSON.stringify({
            client_id: eventModel.client_id,
            event_id: eventModel.event_id,
        }));
        returnResponse();
    });
}

function addCommonParametersToEventModel(eventModel)
{
    let userData = {};
    let userAddressData = {};

    if (eventModel.user_data) {
        userData = eventModel.user_data;
    }

    if (userData.address) {
        userAddressData = userData.address;
    }

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

    if (!eventModel.page_encoding) {
        if (eventModel.pageEncoding) eventModel.page_encoding = eventModel.pageEncoding;
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

    if (!eventModel.page_path) {
        if (eventModel.pagePath) eventModel.page_path = eventModel.pagePath;
    }

    if (!eventModel.page_referrer) {
        if (eventModel.pageReferrer) eventModel.page_referrer = eventModel.pageReferrer;
        else if (eventModel.referrer) eventModel.page_referrer = eventModel.referrer;
    }

    if (!eventModel.page_title) {
        if (eventModel.pageTitle) eventModel.page_title = eventModel.pageTitle;
    }

    if (!eventModel.screen_resolution) {
        if (eventModel.screenResolution) eventModel.screen_resolution = eventModel.screenResolution;
    }

    if (!eventModel.viewport_size) {
        if (eventModel.viewportSize) eventModel.viewport_size = eventModel.viewportSize;
    }

    if (!eventModel.user_id) {
        if (eventModel.userId) eventModel.user_id = eventModel.userId;
    }

    if (!userData.email_address) {
        if (eventModel.userEmail) userData.email_address = eventModel.userEmail;
        else if (eventModel.email) userData.email_address = eventModel.email;
        else if (eventModel.mail) userData.email_address = eventModel.mail;
    }

    if (!userData.phone_number) {
        if (eventModel.userPhoneNumber) userData.phone_number = eventModel.userPhoneNumber;
        else if (eventModel.phoneNumber) userData.phone_number = eventModel.phoneNumber;
        else if (eventModel.phone) userData.phone_number = eventModel.phone;
    }

    if (!userAddressData.first_name) {
        if (eventModel.userFirstName) userAddressData.first_name = eventModel.userFirstName;
        else if (eventModel.first_name) userAddressData.first_name = eventModel.first_name;
        else if (eventModel.firstName) userAddressData.first_name = eventModel.firstName;
        else if (eventModel.name) userAddressData.first_name = eventModel.name;
    }

    if (!userAddressData.last_name) {
        if (eventModel.userLastName) userAddressData.last_name = eventModel.userLastName;
        else if (eventModel.first_name) userAddressData.last_name = eventModel.last_name;
        else if (eventModel.lastName) userAddressData.last_name = eventModel.lastName;
        else if (eventModel.surname) userAddressData.last_name = eventModel.surname;
        else if (eventModel.family_name) userAddressData.last_name = eventModel.family_name;
        else if (eventModel.familyName) userAddressData.last_name = eventModel.familyName;
    }

    if (!userAddressData.street) {
        if (eventModel.street) userAddressData.street = eventModel.street;
    }

    if (!userAddressData.city) {
        if (eventModel.city) userAddressData.city = eventModel.city;
    }

    if (!userAddressData.region) {
        if (eventModel.region) userAddressData.region = eventModel.region;
    }

    if (!userAddressData.region) {
        if (eventModel.region) userAddressData.region = eventModel.region;
        else if (eventModel.state) userAddressData.region = eventModel.state;
    }

    if (!userAddressData.country) {
        if (eventModel.country) userAddressData.country = eventModel.country;
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
    if (eventModel.request_data.query_parameters) {
        for (let queryParameterKey in eventModel.request_data.query_parameters) {
            eventModel[queryParameterKey] = eventModel.request_data.query_parameters[queryParameterKey];
        }
    }

    return eventModel;
}

function addBodyParametersToEventModel(eventModel)
{
    if (eventModel.request_data.body) {
        for (let bodyKey in eventModel.request_data.body) {
            if (bodyKey !== 'data_tag' && bodyKey !== 'data_tag_custom_data' && bodyKey !== 'dtclid') {
                eventModel[bodyKey] = eventModel.request_data.body[bodyKey];
            }
        }
    }

    return eventModel;
}

function addDataTagParametersToEventModel(eventModel)
{
    if (eventModel.request_data.body && eventModel.request_data.body.data_tag === true && eventModel.request_data.body.data_tag_custom_data) {
        for (let dataKey in eventModel.request_data.body.data_tag_custom_data) {
            let dataValue = eventModel.request_data.body.data_tag_custom_data[dataKey].value;
            let dataTransformation = eventModel.request_data.body.data_tag_custom_data[dataKey].transformation;

            if (dataTransformation === 'trim') {
                dataValue = dataValue.trim();
            }

            if (dataTransformation === 'to_lower_case') {
                dataValue = dataValue.trim().toLocaleLowerCase();
            }

            eventModel[eventModel.request_data.body.data_tag_custom_data[dataKey].name] = dataValue;
        }
    }

    return eventModel;
}

function addRequiredParametersToEventModel(eventModel)
{
    if (!eventModel.event_name) {
        let eventName = 'Data';

        if (eventModel.eventName) eventName = eventModel.eventName;
        else if (eventModel.event) eventName = eventModel.event;
        else if (eventModel.name) eventName = eventModel.name;
        else if (eventModel.request_data.path === '/favicon.ico') eventName = 'Favicon';

        eventModel.event_name = eventName;
    }

    if (!eventModel.event_id) {
        eventModel.event_id = eventModel.event_name+'_'+getTimestampMillis()+'_'+generateRandom(0, 100000000);
    }

    if (!eventModel.protocol_version) {
        let protocolVersion = 1.0;


        if (eventModel.protocolVersion) protocolVersion = eventModel.protocolVersion;
        else if (eventModel.protocol) protocolVersion = eventModel.protocol;
        else if (eventModel.v) protocolVersion = eventModel.v;

        eventModel.protocol_version = protocolVersion;
    }

    return eventModel;
}

function getBody()
{
    const body = getRequestBody();

    if (body) {
        const bodyJson = JSON.parse(body);

        if (bodyJson) {

            return bodyJson;
        }

        return body;
    }

    return null;
}

function getDomain()
{
    return getRequestHeader('Host');
}

function getDomainEffectiveTldPlusOne()
{
    const host = getRequestHeader('Host');
    let result = null;

    if (host) {
        result = computeEffectiveTldPlusOne(host);
    }

    return result;
}

function getKnownCookies() {
    let existCookies = {};
    let knownCookies = ['FPID', '_fbc', '_fbp', '_ga', '__cfduid'];

    for (let cookieNameKey in knownCookies) {
        let cookieName = knownCookies[cookieNameKey];
        let cookie = getCookieValues(cookieName);

        if (cookie.length) {
            existCookies[cookieName] = cookie[0];
        }
    }

    return existCookies;
}

function getKnownHeaders() {
    let existHeaders = {};
    let knownHeaders = [
        'Hostname',
        'Host',
        'IP',
        'RemoteAddr',
        'User-Agent',
        'Accept',
        'Accept-Encoding',
        'Accept-Language',
        'Cache-Control',
        'Pragma',
        'X-Real-Ip',
        'X-Forwarded-For',
        'X-Forwarded-Host',
        'Upgrade-Insecure-Requests',
        'Sec-Ch-Ua',
        'Sec-Ch-Ua-Mobile',
    ];

    for (let headerNameKey  in knownHeaders) {
        let headerName = knownHeaders[headerNameKey];
        let header = getRequestHeader(headerName);

        if (header) {
            existHeaders[headerName] = header;
        }
    }

    return existHeaders;
}

function getDtclid(eventModel) {
    if (eventModel.request_data.body && eventModel.request_data.body.dtclid) {
        return eventModel.request_data.body.dtclid;
    }

    if (eventModel.request_data.query_parameters && eventModel.request_data.query_parameters.dtclid) {
        return eventModel.request_data.query_parameters.dtclid;
    }

    if (getCookieValues('_dtclid') && getCookieValues('_dtclid')[0]) {
        return getCookieValues('_dtclid')[0];
    }

    return 'dtclid.1.' + getTimestampMillis() + '.' + generateRandom(100000000, 999999999);
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
