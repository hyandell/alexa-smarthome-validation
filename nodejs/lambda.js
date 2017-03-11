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
        validateContext(context);
        var response = {};
        switch (request.header.namespace) {
            case 'Alexa.ConnectedHome.Discovery':
                response = handleDiscovery(request, context);
                break;
            case 'Alexa.ConnectedHome.Control':
                response = handleControl(request, context);
                break;
            case 'Alexa.ConnectedHome.Query':
                response = handleQuery(request, context);
                break;
            default:
                log('ERROR', 'No supported namespace: ' + request.header.namespace);
                context.succeed( error('UnexpectedInformationReceivedError', {"faultingParameter": request.header.namespace}));
                break;
            }
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
    /**
     * Get the OAuth token from the request
     */
    var user_access_token = request.payload.accessToken.trim();
    /**
     * If the user access token is missing, return InvalidAccessTokenError
     *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!user_access_token){
        log('INFO', 'Discovery Request[' + request.header.messageId + '] failed. No access token provided in request');
        context.succeed( error( request.header, 'InvalidAccessTokenError'));
    }
    /**
     * Generic stub for validating the token against your cloud service
     */
    if (!validAccessToken(user_access_token)){
        log('INFO', 'Discovery Request[' + request.header.messageId + '] failed. Invalid access token. User not recognized');
        context.succeed( error( request.header, 'InvalidAccessTokenError'));
    }
    /**
     * Assume access token is valid at this point
     * Retrieve list of devices from cloud based on token
     *  
     * For more information on a disovery response see
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
     */     
    var payload = {
        discoveredAppliances : getDevicesFromPartnerCloud(user_access_token)
    };
    /**
     * Return same header with namespace and messageId
     * Change the name to 'DiscoverAppliancesResponse'
     */
    var header = request.header;
    header.name = "DiscoveredAppliancesResponse";
    /**
     * Log the response
     * These messages will be stored in CloudWatch
     */
    log('DEBUG', 'Discovery Response: ' + JSON.stringify({payload: payload, header: header}));
    return {header, payload};
}

/**
 * Control events are processed here.
 * This is called when Alexa requests an action (IE turn off appliance).
 */
function handleControl(request, context) {
    /**
     * Is this a Control directive?
     */
    if(request.header.namespace != 'Alexa.ConnectedHome.Control'){
        context.succeed(error(header, 'UnexpectedInformationReceivedError', { 'faultingParameter': request.header.namespace}));
        return;
    }
    /**
     * Is it in the list of known control directives
     */
    if(APPLIANCE_CONTROLS.indexOf(request.header.name) == -1){
        context.succeed(error(header, 'UnexpectedInformationReceivedError', { 'faultingParameter': request.header.name}));
        return;
    }
    /**
     * Get the access_token
     */
    var user_access_token = request.payload.accessToken.trim();
    /**
     * If the user access token is missing, return InvalidAccessTokenError
     *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!user_access_token){
        log('INFO', 'Discovery Request[' + request.header.messageId + '] failed. No access token provided in request');
        context.succeed( error( request.header, 'InvalidAccessTokenError'));
        return;
    }
    /**
     * Generic stub for validating the token against your cloud service
     * 
     * Replace validAccessToken() function with your own validation
     */
    if (!validAccessToken(user_access_token)){
        log('INFO', 'Discovery Request[' + request.header.messageId + '] failed. Invalid access token. User not recognized');
        context.succeed( error( request.header, 'InvalidAccessTokenError'));
        return;
    }
    /**
    var appliance_id = request.
     * Grab the applianceId from the request. This should be the primary
     */
    var applianceId = request.payload.appliance.applianceId;
    /**
     * If the applianceId is missing, return UnexpectedInformationReceivedError
     *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!applianceId){
        log('ERROR', 'No applianceId provided in request');
        context.succeed(response(request.header, 'UnexpectedInformationReceivedError', {'faultingParameter': request.payload.appliance.applianceId}));
        return;
    }
    /**
     * At this point the applianceId and accessToken are present in the 
     * request
     * 
     * validateDevice function is designed to catch a subset of availability errors for the device
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#error-messages
     * 
     * This list, for the purpose of this demo code includes the following simulated checks:
     *  TargetOfflineError
     *  TargetBridgeOfflineError
     *  
     * Please review the full list in the above link for different states that can be reported. 
     * If these apply to your device/cloud infrastructure, please add the checks and respond with 
     * accurate error messages. This will give the user the best experience and help diagnose issues with
     * their devices, accounts, and environment
     */
    validateDevice(request.payload.appliance, function(error, payload){
        if (error){
            context.succeed(response(request.header, error, payload));
            return;
        }
        switch(request.header.name){
            /**
            * TurnOnRequest
            */
            case 'TurnOnRequest':
                turnOn(applianceId, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'TurnOnConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed(response);
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
            * TurnOffRequest
            */
            case 'TurnOffRequest':
                turnOff(applianceId, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'TurnOffConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed(response);
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * SetTargetTemperatureRequest
             */

            // @TODO implement these functions
            case 'SetTargetTemperatureRequest':    
                if (!request.payload.targetTemperature.value){
                    context.succeed(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'targetTemperature'}))
                }
                setTargetTemperature(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'SetTargetTemperatureConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed(response);
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * IncrementTargetTemperatureRequest 
             */  
            case 'IncrementTargetTemperatureRequest':
                if (!request.payload.deltaTemperature.value){
                    context.succeed(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'deltaTemperature'}))
                }
                incrementTargetTemperature(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'IncrementTargetTemperatureConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed(response);
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * DecrementTargetTemperatureRequest
             */
            case 'DecrementTargetTemperatureRequest':
                if (!request.payload.deltaTemperature.value){
                        context.succeed(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'deltaTemperature'}))
                }
                decrementTargetTemperature(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'DecrementTargetTemperatureConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed(response);
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * SetPercentageRequest
             */
            case 'SetPercentageRequest':
                if (!request.payload.percentageState.value){
                        context.succeed(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'percentageState'}))
                }
                setPercentage(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.succeed(response(request.header, error, payload));
                    }
                    var response = response(header, 'DecrementTargetTemperatureConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed();
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * IncrementPercentageRequest
             */
            case 'IncrementPercentageRequest':
                if (!request.payload.deltaPercentage.value){
                        context.fail(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'deltaPercentage'}))
                }
                incrementPercentage(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.fail(response(request.header, error, payload));
                    }
                    var response = response(header, 'IncrementPercentageConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed();
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            /**
             * DecrementPercentageRequest
             */
            case 'DecrementPercentageRequest':
                if (!request.payload.deltaPercentage.value){
                            context.fail(response(request.header, 'ValueOutOfRangeError', {'faultingParameter': 'deltaPercentage'}))
                }
                decrementPercentage(appliance_id, request.payload, function(error, payload){
                    if(error){
                        return context.fail(response(request.header, error, payload));
                    }
                    var response = response(header, 'DecrementPercentageConfirmation');
                    try{
                        validator.validateResponse(request, response);
                        return context.succeed();
                    } catch (error){
                        log('FATAL', error);
                        throw(error);
                    }
                });
            default: 
                break;

            
        }
    });
}

/**
 * Utility functions.
 */

function log(title, msg) {
    console.log('[' + title + ']   -   ' + msg);
}
/*
* error function
* 
* Parameters:
*   header - Original request header so we can return the same.
*   name   - The name of the error. One taken from the following list
*            https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#Error Messages 
*   payload - any special payload required for the error response.
*/

function response(header, name, payload){
    var header = header;
    header.name = name;
    return { header: header, payload: payload};
}
/**
 * getDevicesFromPartnerCloud
 * 
 * Parameters:
 *  access_token - The access token passed into the request
 * 
 * Returns:
 *  List of devices attached to user's account
 */
function getDevicesFromPartnerCloud(access_token){
    // Look up user in canned data above
    var result = USER_DEVICES.users.filter( function(user) {
        return user.access_token == access_token;
    });
    return JSON.stringify(result[0].devices);
}
/**
 * validAccessToken(user_access_token)
 * 
 * Parameters:
 *  user_access_token - The token sent in the request
 * 
 * Returns:
 *  true - if found
 *  false - if not found
 */
function validAccessToken(user_access_token){
    /**
     * Always returns tru for sample code
     * You should update this method to your own access token validation 
     */
    return true;
}
/**
 * validateDevice - Stub method for checking if 
 *   - device is online
 *   - the bridge is online (assumes a hub use case) 
 *   - uncaught exception
 * 
 * callback(error) - Should form a response object using 
 * builtin functions
 */
function validateDevice(appliance, callback){
    /**
     * If bridge is offline
     */
    bridgeOnline(appliance, function(error, payload){
        if (error) callback(error, payload);
    });
    /**
     * If device is offline
     */
    online(appliance, function(error, payload){
        if (error) callback(error, payload);
    });   
}


/**
 * CONTROL FUNCTIONS
 * 
 */


/** 
 * turnOn function should be an abstract of 
 * control.
*/
function turnOn(appliance, callback){
    /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
/** 
 * turnOff function should be an abstract of 
 * control.
*/
function turnOff(appliance, callback){
    /**
     * Testing shim to send local events to simulate Alexa events
     * @TODO: Link to blog post about sending local events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     */

    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function setTargetTemperature(appliance_id, payload, callback){
    /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function incrementTargetTemperature(appliance_id, payload, callback){
  /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function decrementTargetTemperature(appliance_id, payload, callback){
  /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function setPercentage(appliance_id, payload, callback){
  /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function incrementPercentage(appliance_id, payload, callback){
  /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
function decrementPercentage(appliance_id, payload, callback){
  /**
     * Testing shim to send local events to simulate Alexa events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for the following error responses:
     * - DriverInternalError
     * - DependentServiceUnavailableError
     * - TargetConnectivityUnstableError
     * - TargetBridgeConnectivityUnstableError
     * - TargetFirmwareOutdatedError
     * - TargetBridgeFirmwareOutdatedError
     * - TargetHardwareMalfunctionError
     * - TargetBridgetHardwareMalfunctionError
     * - RateLimitExceededError
     * 
     * uncomment the appropriate line belie
     */
    // callback('DriverInternalError');
    // callback('DependentServiceUnavailableError');
    // callback('TargetConnectivityUnstableError');
    // callback('TargetBridgeConnectivityUnstableError');
    // callback('TargetFirmwareOutdatedError');
    // callback('TargetBridgeFirmwareOutdatedError');
    // callback('TargetHardwareMalfunctionError');
    // callback('TargetBridgetHardwareMalfunctionError');
    // callback('RateLimitExceededError');
}
/**
 * bridgeOnline - Stub function 
 * 
 * To hear Alexa' spoken response for TargetBridgeOfflineError response
 *   'TargetOfflineError'
 * Else return null
 * 
 * To use local events, please see 
 * @TODO: Link to blog post about sending local events
 */
function bridgeOnline(appliance, callback){
    /**
     * Testing shim to send events to simulate events
     * @TODO: Link to blog post about sending local events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for TargetBridgeOfflineError response
     * Uncomment the following line which this will return the error for all requests
     */
    
    // callback('TargetBridgeOfflineError');
}
/**
 * online - Stub function 
 * 
 * To hear Alexa' spoken response for TargetOfflineError response
 *  return 'TargetOfflineError'
 * Else return null
 */
function online(appliance, callback){
    /**
     * Testing shim to send events to simulate events
     * @TODO: Link to blog post about sending local events
     */
    if (appliance.additionalApplianceDetails.simulateResponse){
        log('DEBUG', 'Simulating Response: ' + appliance.additionalApplianceDetails.simulateResponse);
        callback(appliance.additionalApplianceDetails.simulateResponse)
    }
    /**
     * To hear Alexa' spoken response for TargetOfflineError response
     * Uncomment the following line
     * 
     * callback('TargetOfflineError');
     */

}
/**
 * List of available directive names for control
 */
var APPLIANCE_CONTROLS = [
    'TurnOnRequest',
    'TurnOffRequest',
    'SetTargetTemperatureRequest',
    'IncrementTargetTemperatureRequest',
    'DecrementTargetTemperatureRequest',
    'SetPercentageRequest',
    'IncrementPercentageRequest',
    'DecrementPercentageRequest' 
    ];
/**
 * Mock data for devices to be discovered
 * 
 * For more information on the the discovered appliance response please see
 * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
var SAMPLE_MANUFACTURER = 'Sample Manufacturer'
var SAMPLE_APPLIANCES = [
        {
            'applianceId': 'switch-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Switch',
            'version': '1',
            'friendlyName': 'Sample Switch',
            'friendlyDescription': 'Switch by ' + SAMPLE_MANUFACTURER,
            'isReachable': True,
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
            'isReachable': True,
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
            'isReachable': True,
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
            'isReachable': False,
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
            'isReachable': True,
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
            'isReachable': True,
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
            'isReachable': True,
            'actions': [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ],
            'additionalApplianceDetails': {}
        }
    ];
};
