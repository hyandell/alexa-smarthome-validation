# -*- coding: utf-8 -*-

# Copyright 2016-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Amazon Software License (the "License"). You may not use this file except in 
# compliance with the License. A copy of the License is located at
# 
#     http://aws.amazon.com/asl/
# 
# or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, 
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific 
# language governing permissions and limitations under the License.

"""Alexa Smart Home API Validation Package for Python.

This module is used by Alexa Smart Home API third party (3P) Python developers to validate their 
Lambda responses before sending them back to Alexa. If an error is found, an exception is thrown so 
that the 3P can catch the error and do something about it, instead of sending it back to Alexa and 
causing an error on the Alexa side.

The validations are based on the current public Alexa Smart Home API reference:
https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
"""

import logging
import re
import sys


"""Various constants used in validation."""

VALID_DISCOVERY_REQUEST_NAMES = ['DiscoverAppliancesRequest']
VALID_CONTROL_REQUEST_NAMES = [
    'TurnOnRequest',
    'TurnOffRequest',
    'SetTargetTemperatureRequest',
    'IncrementTargetTemperatureRequest',
    'DecrementTargetTemperatureRequest',
    'SetPercentageRequest',
    'IncrementPercentageRequest',
    'DecrementPercentageRequest',
    ]
VALID_SYSTEM_REQUEST_NAMES = ['HealthCheckRequest']
VALID_REQUEST_NAMES = VALID_DISCOVERY_REQUEST_NAMES + VALID_CONTROL_REQUEST_NAMES + VALID_SYSTEM_REQUEST_NAMES

VALID_DISCOVERY_RESPONSE_NAMES = ['DiscoverAppliancesResponse']
VALID_CONTROL_RESPONSE_NAMES = [
    'TurnOnConfirmation',
    'TurnOffConfirmation',
    'SetTargetTemperatureConfirmation',
    'IncrementTargetTemperatureConfirmation',
    'DecrementTargetTemperatureConfirmation',
    'SetPercentageConfirmation',
    'IncrementPercentageConfirmation',
    'DecrementPercentageConfirmation',
    ]
VALID_CONTROL_ERROR_RESPONSE_NAMES = [
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
    'UnwillingToSetValueError',
    'RateLimitExceededError',
    'NotSupportedInCurrentModeError',
    'ExpiredAccessTokenError',
    'InvalidAccessTokenError',
    'UnsupportedTargetError',
    'UnsupportedOperationError',
    'UnsupportedTargetSettingError',
    'UnexpectedInformationReceivedError',
    ]
VALID_SYSTEM_RESPONSE_NAMES = ['HealthCheckResponse']
VALID_RESPONSE_NAMES = VALID_DISCOVERY_RESPONSE_NAMES + VALID_CONTROL_RESPONSE_NAMES + VALID_CONTROL_ERROR_RESPONSE_NAMES + VALID_SYSTEM_RESPONSE_NAMES

VALID_NON_EMPTY_PAYLOAD_RESPONSE_NAMES = [
    'SetTargetTemperatureConfirmation',
    'IncrementTargetTemperatureConfirmation',
    'DecrementTargetTemperatureConfirmation',
    'ValueOutOfRangeError',
    'DependentServiceUnavailableError',
    'TargetFirmwareOutdatedError',
    'TargetBridgeFirmwareOutdatedError',
    'UnwillingToSetValueError',
    'RateLimitExceededError',
    'NotSupportedInCurrentModeError',
    'UnexpectedInformationReceivedError',
    ]
VALID_ACTIONS = [
    'setTargetTemperature',
    'incrementTargetTemperature',
    'decrementTargetTemperature',
    'setPercentage',
    'incrementPercentage',
    'decrementPercentage',
    'turnOff',
    'turnOn',
    ]
VALID_TEMPERATURE_MODES = ['HEAT','COOL','AUTO']
VALID_CURRENT_DEVICE_MODES = ['HEAT','COOL','AUTO','AWAY','OTHER']
VALID_ERROR_INFO_CODES = ['ThermostatIsOff']
VALID_TIME_UNITS = ['MINUTE','HOUR','DAY']

REQUIRED_HEADER_KEYS = ['namespace','name','payloadVersion','messageId']
REQUIRED_RESPONSE_KEYS = ['header','payload']
REQUIRED_DISCOVERED_APPLIANCE_KEYS = ['applianceId','manufacturerName','modelName','version','friendlyName','friendlyDescription','isReachable','actions','additionalApplianceDetails']

def validateContext(context):
	"""Validate the Lambda context.

	Currently, this method just checks to ensure that the Lambda timeout is set to 7 seconds or less.
	This is to ensure that your Lambda times out and errors before Alexa times out (8 seconds), 
	allowing you to see the timeout error. Otherwise, you could take > 8 seconds to respond and even
	though you think you have responded properly and without error, Alexa actually timed out resulting
	in an error to the user.
	"""

    if context.get_remaining_time_in_millis() > 7000: raise_value_error(generate_error_message('Lambda','timeout must be 7 seconds or less',context))


def validateResponse(request,response):
	"""Validate the response to a request.

	This is the main validation method to be called in your Lambda handler, just before you return
	the response to Alexa. This method validates the request to ensure it is valid, and then dispatches
	to specific response validation methods depending on the request namespace.
	"""

	# Validate request
    if request is None: raise_value_error(generate_error_message('Request','request is missing',request))
    if not bool(request): raise_value_error(generate_error_message('Request','request must not be empty',request))
    if not isinstance(request,dict): raise_value_error(generate_error_message('Request','request must be a dict',request))
    try:
    	request_namespace = request['header']['namespace']
    except:
    	raise_value_error(generate_error_message('Request','request is invalid',request))

    # Validate response
    if response is None: raise_value_error(generate_error_message('Response','response is missing',response))
    if not bool(response): raise_value_error(generate_error_message('Response','response must not be empty',response))
    if not isinstance(response,dict): raise_value_error(generate_error_message('Response','response must be a dict',response))

    for required_key in REQUIRED_RESPONSE_KEYS:
        if required_key not in response: raise_value_error(generate_error_message('Response',format(required_key) + ' is missing',response))

    if request_namespace == 'Alexa.ConnectedHome.Discovery':
        validateDiscoveryResponse(request,response)
    elif request_namespace == 'Alexa.ConnectedHome.Control':
        validateControlResponse(request,response)
    elif request_namespace == 'Alexa.ConnectedHome.System':
    	validateSystemResponse(request,response)
    else:
        raise_value_error(generate_error_message('Request','request.header.namespace is invalid',request))

def validateSystemResponse(request,response):
	"""Validate the response to a Health Check request.

	This method validates the response to a Health Check request, based on the API reference:
	https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#health-check-messages
	"""	

    # Validate header
    validateResponseHeader(request,response)
    response_name = response['header']['name']

    # Validate response payload
    try:
    	payload = response['payload']
    except:
        raise_value_error(generate_error_message(response_name,'payload is missing',response))

    if payload is None: raise_value_error(generate_error_message(response_name,'payload is missing',payload))

    # check payload
    for required_key in ['description','isHealthy']:
        if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        if is_empty_string(payload['description']): raise_value_error(generate_error_message(response_name,'payload.description must not be empty',payload))
        if not isinstance(payload['isHealthy'],bool): raise_value_error(generate_error_message(response_name,'payload.isHealthy must be a boolean',payload))

def validateDiscoveryResponse(request,response):
	"""Validate the response to a DiscoverApplianceRequest request.

	This method validates the response to a DiscoverApplianceRequest request, based on the API reference:
	https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
	"""	

    # Validate header
    validateResponseHeader(request,response)
    response_name = response['header']['name']

    # Validate response payload
    try:
    	payload = response['payload']
    except:
        raise_value_error(generate_error_message(response_name,'payload is missing',response))

    if payload is None: raise_value_error(generate_error_message(response_name,'payload is missing',payload))
    if not isinstance(payload,dict): raise_value_error(generate_error_message(response_name,'payload must be a dict',payload))

    if 'discoveredAppliances' not in payload: raise_value_error(generate_error_message(response_name,'payload.discoveredAppliances is missing',payload))
    if not isinstance(payload['discoveredAppliances'],list): raise_value_error(generate_error_message(response_name,'payload.discoveredAppliances must be a list',payload))
    if len(payload['discoveredAppliances']) > 300: raise_value_error(generate_error_message(response_name,'payload.discoveredAppliances must not contain more than 300 appliances',payload))

    # Validate each discovered appliance
    for discoveredAppliance in payload['discoveredAppliances']:
        
        for required_key in REQUIRED_DISCOVERED_APPLIANCE_KEYS:
            if required_key not in discoveredAppliance: raise_value_error(generate_error_message(response_name,format(required_key) + ' is missing',discoveredAppliance))

        if is_empty_string(discoveredAppliance['applianceId']): raise_value_error(generate_error_message(response_name,'applianceId must not be empty',discoveredAppliance))
        if len(discoveredAppliance['applianceId']) > 256: raise_value_error(generate_error_message(response_name,'applianceId must not exceed 256 characters',discoveredAppliance))
        if not re.match('^[a-zA-Z0-9_\-=#;:?@&]*$',discoveredAppliance['applianceId']): raise_value_error(generate_error_message(response_name,'applianceId must be alphanumeric or include these special characters: _-=#;:?@&',discoveredAppliance))
        if is_empty_string(discoveredAppliance['manufacturerName']): raise_value_error(generate_error_message(response_name,'manufacturerName must not be empty',discoveredAppliance))
        if len(discoveredAppliance['manufacturerName']) > 128: raise_value_error(generate_error_message(response_name,'manufacturerName must not exceed 128 characters',discoveredAppliance))
        if is_empty_string(discoveredAppliance['modelName']): raise_value_error(generate_error_message(response_name,'modelName must not be empty',discoveredAppliance))
        if len(discoveredAppliance['modelName']) > 128: raise_value_error(generate_error_message(response_name,'modelName must not exceed 128 characters',discoveredAppliance))
        if is_empty_string(discoveredAppliance['version']): raise_value_error(generate_error_message(response_name,'version must not be empty',discoveredAppliance))
        if len(discoveredAppliance['version']) > 128: raise_value_error(generate_error_message(response_name,'version must not exceed 128 characters',discoveredAppliance))
        if is_empty_string(discoveredAppliance['friendlyName']): raise_value_error(generate_error_message(response_name,'friendlyName must not be empty',discoveredAppliance))
        if len(discoveredAppliance['friendlyName']) > 128: raise_value_error(generate_error_message(response_name,'friendlyName must not exceed 128 characters',discoveredAppliance))
        if not is_alphanumeric_and_spaces(discoveredAppliance['friendlyName']): raise_value_error(generate_error_message(response_name,'friendlyName must be specified in alphanumeric characters and spaces',discoveredAppliance))
        if is_empty_string(discoveredAppliance['friendlyDescription']): raise_value_error(generate_error_message(response_name,'friendlyDescription must not be empty',discoveredAppliance))
        if len(discoveredAppliance['friendlyDescription']) > 128: raise_value_error(generate_error_message(response_name,'friendlyDescription must not exceed 128 characters',discoveredAppliance))
        if not isinstance(discoveredAppliance['isReachable'],bool): raise_value_error(generate_error_message(response_name,'isReachable must be a boolean',discoveredAppliance))
        if not isinstance(discoveredAppliance['actions'],list): raise_value_error(generate_error_message(response_name,'actions must be a list',discoveredAppliance))
        if len(discoveredAppliance['actions']) == 0: raise_value_error(generate_error_message(response_name,'actions must not be empty',discoveredAppliance))

        for action in discoveredAppliance['actions']:
            if action not in VALID_ACTIONS: raise_value_error(generate_error_message(response_name,format(action) + ' is an invalid action',discoveredAppliance))

        if discoveredAppliance['additionalApplianceDetails'] is not None:
            if sys.getsizeof(discoveredAppliance['additionalApplianceDetails']) > 5000: raise_value_error(generate_error_message(response_name,'additionalApplianceDetails must not exceed 5000 bytes',discoveredAppliance))


def validateControlResponse(request,response):
    # check header
    validateResponseHeader(request,response)

    payload = response['payload']
    request_name = request['header']['name']
    response_name = response['header']['name']

    # check if payload exists
    if payload is None: raise_value_error(generate_error_message(response_name,'payload is missing',payload))

    # check empty payload responses
    if response_name not in VALID_NON_EMPTY_PAYLOAD_RESPONSE_NAMES:
        if bool(payload): raise_value_error(generate_error_message(response_name,'payload must be empty',payload))
    else:
        if not bool(payload): raise_value_error(generate_error_message(response_name,'payload must not be empty',payload))

    # check thermostat responses
    if response_name in ['SetTargetTemperatureConfirmation','IncrementTargetTemperatureConfirmation','DecrementTargetTemperatureConfirmation']: 
        # check payload
        for required_key in ['targetTemperature','temperatureMode','previousState']:
            if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        if 'value' not in payload['targetTemperature']: raise_value_error(generate_error_message(response_name,'payload.targetTemperature.value is missing',payload))
        if not is_number(payload['targetTemperature']['value']): raise_value_error(generate_error_message(response_name,'payload.targetTemperature.value must be a number',payload))
        if 'value' not in payload['temperatureMode']: raise_value_error(generate_error_message(response_name,'payload.temperatureMode.value is missing',payload))
        if payload['temperatureMode']['value'] not in VALID_TEMPERATURE_MODES: raise_value_error(generate_error_message(response_name,'payload.temperatureMode.value is invalid',payload))

        # check payload.previousState
        for required_key in ['targetTemperature','temperatureMode']:
            if required_key not in payload['previousState']: raise_value_error(generate_error_message(response_name,'payload.previousState.' + format(required_key) + ' is missing',payload))
        if 'value' not in payload['previousState']['targetTemperature']: raise_value_error(generate_error_message(response_name,'payload.previousState.targetTemperature.value is missing',payload))
        if not is_number(payload['previousState']['targetTemperature']['value']): raise_value_error(generate_error_message(response_name,'payload.previousState.targetTemperature.value must be a number',payload))
        if 'value' not in payload['previousState']['temperatureMode']: raise_value_error(generate_error_message(response_name,'payload.previousState.temperatureMode.value is missing',payload))
        if payload['previousState']['temperatureMode']['value'] not in VALID_TEMPERATURE_MODES: raise_value_error(generate_error_message(response_name,'payload.previousState.temperatureMode.value is invalid',payload))

    # check error responses
    if response_name == 'ValueOutOfRangeError':
        for required_key in ['minimumValue','maximumValue']:
            if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
            if not is_number(payload[required_key]): raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' must be a number',payload))

    if response_name == 'DependentServiceUnavailableError':
        required_key = 'dependentServiceName'
        if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        if not is_alphanumeric_and_spaces(payload[required_key]): raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' must be specified in alphanumeric characters and spaces',payload))

    if response_name in ['TargetFirmwareOutdatedError','TargetBridgeFirmwareOutdatedError']:
        for required_key in ['minimumFirmwareVersion','currentFirmwareVersion']:
            if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
            if is_empty_string(payload[required_key]): raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' must not be empty',payload))
            if not is_alphanumeric(payload[required_key]): raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' must be specified in alphanumeric characters',payload))

    if response_name == 'UnwillingToSetValueError':
        required_key = 'errorInfo'
        if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))

        for required_key in ['code','description']:
            if required_key not in payload['errorInfo']: raise_value_error(generate_error_message(response_name,'payload.errorInfo' + format(required_key) + ' is missing',payload))

        if payload['errorInfo']['code'] not in VALID_ERROR_INFO_CODES: raise_value_error(generate_error_message(response_name,'payload.errorInfo.code is invalid',payload))

    if response_name == 'RateLimitExceededError':
        for required_key in ['rateLimit','timeUnit']:
            if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        
        if not payload['rateLimit'].isdigit(): raise_value_error(generate_error_message(response_name,'payload.rateLimit must be a positive integer',payload))
        if payload['timeUnit'] not in VALID_TIME_UNITS: raise_value_error(generate_error_message(response_name,'payload.timeUnit is invalid',payload))

    if response_name == 'NotSupportedInCurrentModeError':
        required_key = 'currentDeviceMode'
        if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        if payload[required_key] not in VALID_CURRENT_DEVICE_MODES: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is invalid',payload))

    if response_name == 'UnexpectedInformationReceivedError':
        required_key = 'faultingParameter'
        if required_key not in payload: raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' is missing',payload))
        if is_empty_string(payload[required_key]): raise_value_error(generate_error_message(response_name,'payload.' + format(required_key) + ' must not be empty',payload))


def validateResponseHeader(request,response):
    request_name = request['header']['name']
    header = response['header']

    # check if request_name is valid
    if request_name not in VALID_REQUEST_NAMES: raise_value_error(generate_error_message('Request','request name is invalid',request))

    # check if header exists
    if header is None: raise_value_error(generate_error_message('Response','response header is missing',response))

    # check header required params
    for required_header_key in REQUIRED_HEADER_KEYS:
        if required_header_key not in header: raise_value_error(generate_error_message('Response','header.' + required_header_key + ' is required',header))

    # check header namespace and name
    if request_name in VALID_DISCOVERY_REQUEST_NAMES:
        if header['namespace'] != 'Alexa.ConnectedHome.Discovery': raise_value_error(generate_error_message('Discovery Response','header.namespace must be Alexa.ConnectedHome.Discovery',header))
        if header['name'] not in VALID_DISCOVERY_RESPONSE_NAMES: raise_value_error(generate_error_message('Discovery Response','header.name is invalid',header))
        correct_response_name = request_name.replace('Request','Response')
        if header['name'] != correct_response_name: raise_value_error(generate_error_message('Discovery Response','header.name must be ' + correct_response_name + ' for ' + request_name,header))

    if request_name in VALID_CONTROL_REQUEST_NAMES:
        if header['namespace'] != 'Alexa.ConnectedHome.Control': raise_value_error(generate_error_message('Control Response','header.namespace must be Alexa.ConnectedHome.Control',header))
        if header['name'] not in VALID_CONTROL_RESPONSE_NAMES + VALID_CONTROL_ERROR_RESPONSE_NAMES: raise_value_error(generate_error_message('Control Response','header.name is invalid',header))
        if header['name'] not in VALID_CONTROL_ERROR_RESPONSE_NAMES:
            correct_response_name = request_name.replace('Request','Confirmation')
            if header['name'] != correct_response_name: raise_value_error(generate_error_message('Control Response','header.name must be an error response name or ' + correct_response_name + ' for ' + request_name,header))
	
	if request_name in VALID_SYSTEM_REQUEST_NAMES:
		if header['namespace'] != 'Alexa.ConnectedHome.System': raise_value_error(generate_error_message('System Response','header.namespace must be Alexa.ConnectedHome.System',header))
		if header['name'] not in VALID_SYSTEM_RESPONSE_NAMES: raise_value_error(generate_error_message('System Response','header.name is invalid',header))
		correct_response_name = request_name.replace('Request','Response')
		if header['name'] != correct_response_name: raise_value_error(generate_error_message('System Response','header.name must be ' + correct_response_name + ' for ' + request_name,header))
    
    # check common header constraints
    if header['payloadVersion'] != '2': raise_value_error(generate_error_message(header['name'],'header.payloadVersion must be \'2\' (string)',header))
    if not re.match('^[a-zA-Z0-9\-]*$',header['messageId']): raise_value_error(generate_error_message(header['name'],'header.messageId must be specified in alphanumeric characters or - ',header))
    if is_empty_string(header['messageId']): raise_value_error(generate_error_message(header['name'],'header.messageId must not be empty',header))
    if len(header['messageId']) > 127: raise_value_error(generate_error_message(header['name'],'header.messageId must not exceed 127 characters',header))


# utility functions
def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

def is_alphanumeric_and_spaces(s):
    return re.match('^[a-zA-Z0-9 ]*$',s)

def is_alphanumeric(s):
    return re.match('^[a-zA-Z0-9]*$',s)    

def is_empty_string(s):
    return len(str(s).strip()) == 0

def raise_value_error(message):
    raise ValueError(message)

def generate_error_message(title,message,data):
    return title + ' :: ' + message + ': ' + format(data)
