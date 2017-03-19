/* -*- coding: utf-8 -*- */

/*
Copyright 2016-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in 
compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, 
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific 
language governing permissions and limitations under the License.
*/

/**
 * This sample demonstrates a  smart home skill using the publicly available API on Amazon's Alexa platform.
 * For more information about developing smart home skills see 
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/content/smart-home
 * 
 * The Alexa smart home API currently supports:
 *  - Dimmable and Non-dimmable lighting
 *  - Thermostats
 * 
 * For details on the smart home API please visit
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 * 
 */

/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function
 */
var validator = require('validation');

exports.handler = function(request, context) {  
    try{
        validator.validateContext();
        var resp = {};
        if (request.header.namespace === 'Alexa.ConnectedHome.Discovery'){
            resp = handleDiscovery(request, context);
        }
        if (request.header.namespace === 'Alexa.ConnectedHome.Control' || request.header.namespace === 'Alexa.ConnectedHome.Query'){
            resp = handleControl(request, context);
        }
        validator.validateResponse(request, resp);   
        context.succeed(resp);
    } catch(err){
        log('ERROR', err);
        throw err;
    }
};
/**
 * This method is invoked when we receive a "Discovery" message from Alexa Smart Home Skill.
 * We are expected to respond back with a list of appliances that we have discovered for a given
 * customer. 
 * 
 * Function: handleDiscovery 
 * 
 * Params:
 *  request:    The full request object from the Alexa smart home service. This represents a DiscoverAppliancesRequest
 *              https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesrequest
 *  
 *  context:    The context object on which to succeed or fail the response. 
 *              If successful discovery, return context.succeed(<DiscoverAppliancesResponse>)
 *                  <DiscoverAppliancesResponse> - https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 *              If failed discovery, return context.fail(<error>)
 *                  <error> - One of https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#Error Messages
 * 
 * Decription:
 *  For the purposes of this sample code, we will return:
 *      @TODO copy David's devices so they are consistent'
 */
function handleDiscovery(request, context) {
    var payload = {
        discoveredAppliances : SAMPLE_APPLIANCES.concat(generateSampleErrorAppliances())
    };
    var header =  JSON.parse(JSON.stringify(request.header));
    header.name = "DiscoverAppliancesResponse";
    return {header, payload};
}
function handleControl(request, context) {
    var payload = {};
    var appliance_id = request.payload.appliance.applianceId;
    var message_id = request.header.messageId;
    var request_name = request.header.name;

    var response_name = '';

    var previous_temperature = 21.0;
    var minimum_temperature = 5.0;
    var maximum_temperature = 30.0;

    if (appliance_id === 'ThermostatAuto-001'){
        var previous_mode = 'AUTO';
        var target_mode = 'AUTO';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'ThermostatHeat-001'){
        var previous_mode = 'HEAT';
        var target_mode = 'HEAT';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'ThermostatCool-001'){
        var previous_mode = 'COOL';
        var target_mode = 'COOL';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'ThermostatEco-001'){
        var previous_mode = 'ECO';
        var target_mode = 'ECO';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'ThermostatCustom-001'){
        var previous_mode = 'CUSTOM';
        var target_mode = 'CUSTOM';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'ThermostatOff-001'){
        var previous_mode = 'OFF';
        var target_mode = 'OFF';
        var response = generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature);
    }
    else if (appliance_id === 'Lock-001'){
        if (request_name === 'SetLockStateRequest'){
            response_name = 'SetLockStateConfirmation';
            payload = {'lockState': request.payload.lockState};
        }            
        else if (request_name === 'GetLockStateRequest'){
            response_name = 'GetLockStateResponse'
            payload = {'lockState': 'UNLOCKED', 'applianceResponseTimestamp': getUTCTimestamp()};
        }

        if (response_name === 'UnableToGetValueError'){
            header.namespace = 'Alexa.ConnectedHome.Query';
        }
        var header = generateResponseHeader(request,response_name);
        var response = generateResponse(header,payload);
    }
    else if (isSampleErrorAppliance(appliance_id)){
        response_name = appliance_id.replace('-002','');
        var header = generateResponseHeader(request,response_name);
        var payload = {}
        if (response_name === 'ValueOutOfRangeError'){
            payload = {
                'minimumValue': 5.0,
                'maximumValue': 30.0,
            };
        }
        else if ( response_name === 'DependentServiceUnavailableError'){
            payload = {
                'dependentServiceName': 'Customer Credentials Database',
            };
        }
        else if (response_name === 'TargetFirmwareOutdatedError' || response_name === 'TargetBridgeFirmwareOutdatedError'){
            payload = {
                'minimumFirmwareVersion': '17',
                'currentFirmwareVersion': '6',
            };
        }
        else if (isInArray(['UnableToGetValueError','UnableToSetValueError'], response_name)){
            payload = {
                'errorInfo': {
                    'code': 'LOW_BATTERY',
                    'description': 'The requested operation cannot be completed because the device has low battery.',
                }
            };
            if (response_name === 'UnableToGetValueError'){
                header.namespace = 'Alexa.ConnectedHome.Query';
            }
        }
        else if (response_name === 'UnwillingToSetValueError'){
            payload = {
                'errorInfo': {
                    'code': 'ThermostatIsOff',
                    'description': 'The requested operation is unsafe because it requires changing the mode.',
                }
            };
        }
        else if (response_name == 'RateLimitExceededError'){
            payload = {
                'rateLimit': '10',
                'timeUnit': 'HOUR',
            };
        }
        else if (response_name == 'NotSupportedInCurrentModeError'){
            payload = {
                'currentDeviceMode': 'AWAY',
            };
        }
        else if (response_name == 'UnexpectedInformationReceivedError'){
            payload = {
                'faultingParameter': 'value',
            };
        }
        response = generateResponse(header,payload);
    }
    else{
        if (request_name === 'TurnOnRequest'){
            response_name = 'TurnOnConfirmation';
            
        }
        if (request_name === 'TurnOffRequest'){
            response_name = 'TurnOffConfirmation';
            payload = {};
        }
        if (request_name === 'SetTargetTemperatureRequest'){
            response_name = 'SetTargetTemperatureConfirmation'
            target_temperature = request.payload.targetTemperature.value;
            payload = {
                'targetTemperature': {
                    'value': target_temperature
                },
                'temperatureMode': {
                    'value': 'AUTO'
                },
                'previousState' : {
                    'targetTemperature':{
                        'value': 21.0
                    },
                    'temperatureMode':{
                        'value': 'AUTO'
                    }
                }
            };
        }
        if (request_name === 'IncrementTargetTemperatureRequest'){
            response_name = 'IncrementTargetTemperatureConfirmation';
            delta_temperature = request.payload.deltaTemperature.value;
            payload = {
                'previousState': {
                    'temperatureMode': {
                        'value': 'AUTO'
                    },
                    'targetTemperature': {
                        'value': 21.0
                    }
                },
                'targetTemperature': {
                    'value': 21.0 + delta_temperature
                },
                'temperatureMode': {
                    'value': 'AUTO'
                }
            };
        }      
        if (request_name === 'DecrementTargetTemperatureRequest'){
            response_name = 'DecrementTargetTemperatureConfirmation'
            delta_temperature = request.payload.deltaTemperature.value;
            payload = {
                'previousState': {
                    'temperatureMode': {
                        'value': 'AUTO'
                    },
                    'targetTemperature': {
                        'value': 21.0
                    }
                },
                'targetTemperature': {
                    'value': 21.0 - delta_temperature
                },
                'temperatureMode': {
                    'value': 'AUTO'
                }
            };
        }    
        if (request_name === 'SetPercentageRequest'){
            response_name = 'SetPercentageConfirmation';
        }
        if (request_name === 'IncrementPercentageRequest'){
            response_name = 'IncrementPercentageConfirmation';
        }
        if (request_name === 'DecrementPercentageRequest'){
            response_name = 'DecrementPercentageConfirmation';
        }
        if (appliance_id === 'sample-5'){
            response_name = 'TargetOfflineError';
        }
        var header = generateResponseHeader(request,response_name)
        var response = generateResponse(header,payload)
    }
    return response;
}

/**
 * Utility functions.
 */

function log(title, msg) {
    console.log('[' + title + ']   -   ' + msg);
}
function generateSampleErrorAppliances(){
    // this should be in sync with same list in validation.py
    var VALID_CONTROL_ERROR_RESPONSE_NAMES = [
        'ValueOutOfRangeError',
        'TargetOfflineError',
        'BridgeOfflineError',
        'NoSuchTargetError',
        'DriverInternalError',
        'DependentServiceUnavailableError',
        'TargetConnectivityUnstableError',
        'TargetBridgeConnectivityUnstableError',
        'TargetFirmwareOutdatedError',
        'TargetBridgeFirmwareOutdatedError',
        'TargetHardwareMalfunctionError',
        'TargetBridgeHardwareMalfunctionError',
        'UnableToGetValueError',
        'UnableToSetValueError',
        'UnwillingToSetValueError',
        'RateLimitExceededError',
        'NotSupportedInCurrentModeError',
        'ExpiredAccessTokenError',
        'InvalidAccessTokenError',
        'UnsupportedTargetError',
        'UnsupportedOperationError',
        'UnsupportedTargetSettingError',
        'UnexpectedInformationReceivedError'
    ];
    var sample_error_appliances = [];
    var device_number = 100;

    VALID_CONTROL_ERROR_RESPONSE_NAMES.forEach( function(error){
        sample_error_appliance = {
            'applianceId': error + '-002',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Switch',
            'version': '1',
            'friendlyName': 'Device ' + device_number,
            'friendlyDescription': 'Alexa turn on Device ' + device_number + '. Response: ' + error,
            'isReachable': true,
            'actions': [
                'turnOn',
                'turnOff',
            ],
            'additionalApplianceDetails': {}
        };

        if (error === 'ValueOutOfRangeError'){
            sample_error_appliance.friendlyDescription = 'Alexa set Device ' + device_number + ' to 80 degrees. Response: ' + error;
            sample_error_appliance.modelName = 'Thermostat';
            sample_error_appliance.actions = [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ];
        }
        sample_error_appliances.push(sample_error_appliance);
        device_number = device_number + 1;
    });
    return sample_error_appliances;
}
function isSampleErrorAppliance(appliance_id){
    return appliance_id.endsWith('-002');
}

function generateResponseHeader(request,response_name){
    var header = {
        'namespace': request.header.namespace,
        'name': response_name,
        'payloadVersion': '2',
        'messageId': request.header.messageId        
    }
    return header;
}
function generateResponse(header,payload){
    var response = {
        'header': header,
        'payload': payload,
    };
    return response;
}
function generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature){
    var request_name = request.header.name;
    var message_id = request.header.messageId;
    var response_name, target_temperature, payload;
    // valid request    
    if (isInArray(['SetTargetTemperatureRequest','IncrementTargetTemperatureRequest','DecrementTargetTemperatureRequest'], request_name)){
        if (request_name === 'SetTargetTemperatureRequest'){
            response_name = 'SetTargetTemperatureConfirmation';
            target_temperature = request.payload.targetTemperature.value;
        }
        if (request_name === 'IncrementTargetTemperatureRequest'){
            response_name = 'IncrementTargetTemperatureConfirmation';
            target_temperature = previous_temperature + request.payload.deltaTemperature.value;
        }
        if (request_name === 'DecrementTargetTemperatureRequest'){
            response_name = 'DecrementTargetTemperatureConfirmation';
            target_temperature = previous_temperature - request.payload.deltaTemperature.value;
        }
        // valid target temperature
        if (target_temperature <= maximum_temperature && target_temperature >= minimum_temperature){
            payload = {
                'targetTemperature': {
                    'value': target_temperature
                },
                'temperatureMode': {
                    'value': target_mode
                },
                'previousState' : {
                    'targetTemperature':{
                        'value': previous_temperature
                    },
                    'temperatureMode':{
                        'value': previous_mode
                    }
                }        
            };
        }
        else{
            response_name = 'ValueOutOfRangeError';
            payload = {
                'minimumValue': 5.0,
                'maximumValue': 30.0,
            };
        }
    }
    else if (request_name === 'GetTemperatureReadingRequest'){
        response_name = 'GetTemperatureReadingResponse';
        payload = {
            'temperatureReading': {
                'value': 21.00,
            }
        };
    }
    else if (request_name === 'GetTargetTemperatureRequest'){
        response_name = 'GetTargetTemperatureResponse';
        payload = {
            'applianceResponseTimestamp': getUTCTimestamp(),
            'temperatureMode': {
                'value': target_mode,
                'friendlyName': '',
            }
        };

        if (isInArray(['HEAT','COOL','ECO','CUSTOM'], target_mode)){
            payload['targetTemperature'] = {
                'value': 21.00,
            };
        }
        else if (target_mode  === 'AUTO'){
            payload.coolingTargetTemperature = {
                'value': 23.00
            };
            payload.heatingTargetTemperature = {
                'value': 19.00
            };
        }
        if (target_mode == 'CUSTOM')
            payload.temperatureMode.friendlyName = 'Manufacturer custom mode';
    }
    else{
        response_name = 'UnexpectedInformationReceivedError';
        payload = {
            'faultingParameter': 'request.name: ' + request_name
        };
    }
    var header = generateResponseHeader(request,response_name);
    var response = generateResponse(header,payload);
    return response;
}

function getUTCTimestamp(){
    return new Date().toISOString();
}
var SAMPLE_MANUFACTURER = 'Sample Manufacturer';
var SAMPLE_APPLIANCES = [
        {
            'applianceId': 'switch-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Switch',
            'version': '1',
            'friendlyName': 'Sample Switch',
            'friendlyDescription': 'Switch by ' + SAMPLE_MANUFACTURER,
            'isReachable': true,
            'actions': [
                'turnOn',
                'turnOff',
            ],
            'additionalApplianceDetails': {
                'extraDetail1': 'This is an on/off switch that is online and reachable',
            }        
        },
        {
            'applianceId': 'dimmer-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Dimmer',
            'version': '1',
            'friendlyName': 'Sample Dimmer',
            'friendlyDescription': 'Dimmer by ' + SAMPLE_MANUFACTURER,
            'isReachable': true,
            'actions': [
                'turnOn',
                'turnOff',
                'setPercentage',
                'incrementPercentage',
                'decrementPercentage',
            ],
            'additionalApplianceDetails': {
                'extraDetail1': 'This is a dimmer that is online and reachable',
            }        
        },
        {
            'applianceId': 'fan-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Fan',
            'version': '1',
            'friendlyName': 'Sample Fan',
            'friendlyDescription': 'Fan by ' + SAMPLE_MANUFACTURER,
            'isReachable': true,
            'actions': [
                'turnOn',
                'turnOff',
                'setPercentage',
                'incrementPercentage',
                'decrementPercentage',
            ],
            'additionalApplianceDetails': {
                'extraDetail1': 'This is a fan that is online and reachable',
            }        
        },
        {
            'applianceId': 'switch-unreachable-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Switch',
            'version': '1',
            'friendlyName': 'Sample Switch Unreachable',
            'friendlyDescription': 'Switch by ' + SAMPLE_MANUFACTURER,
            'isReachable': false,
            'actions': [
                'turnOn',
                'turnOff',
            ],
            'additionalApplianceDetails': {
                'extraDetail1': 'This is an on/off switch that is not reachable and should show as offline in the Alexa app',
            }
        },
        {
            'applianceId': 'ThermostatAuto-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Thermostat',
            'version': '1',
            'friendlyName': 'Amazon Basement',
            'friendlyDescription': 'Thermostat in AUTO mode and reachable',
            'isReachable': true,
            'actions': [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ],
            'additionalApplianceDetails': {}
        },
        {
            'applianceId': 'ThermostatHeat-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Thermostat',
            'version': '1',
            'friendlyName': 'Amazon Heater',
            'friendlyDescription': 'Thermostat in HEAT mode and reachable',
            'isReachable': true,
            'actions': [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ],
            'additionalApplianceDetails': {}
        },
        {
            'applianceId': 'ThermostatCool-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Thermostat',
            'version': '1',
            'friendlyName': 'Amazon Cooler',
            'friendlyDescription': 'Thermostat in COOL mode and reachable',
            'isReachable': true,
            'actions': [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ],
            'additionalApplianceDetails': {}
        }
];
function isEmpty(obj) {
    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}
function isInArray(array, object) {
    if (isEmpty(array)){
        return false;
    }
    if (isEmpty(object)){
        return false;
    }
    return array.indexOf(object) > -1;
}