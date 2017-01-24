# -*- coding: utf-8 -*-

import logging
import httplib
import re
import sys
from validation import validateResponse, validateContext

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SAMPLE_MANUFACTURER = 'Sample Manufacturer'
SAMPLE_APPLIANCES = [
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
    },
]

def lambda_handler(event,context):
    try:
        validateContext(context)

        logger.info('Request Header:{}'.format(event['header']))
        logger.info('Request Payload:{}'.format(event['payload']))

        response = {}
        if event['header']['namespace'] == 'Alexa.ConnectedHome.Discovery':
            response = handleDiscovery(event,context)      
        elif event['header']['namespace'] == 'Alexa.ConnectedHome.Control':
            response = handleControl(event,context)

        validateResponse(event,response)
        
        logger.info('Response Header:{}'.format(response['header']))
        logger.info('Response Payload:{}'.format(response['payload']))
        
        return response
    except ValueError as error:
        logger.error(error)
        raise
        
def handleDiscovery(event,context):
    response_name = 'DiscoverAppliancesResponse'
    header = generateResponseHeader(event,response_name)
    payload = {
       'discoveredAppliances': SAMPLE_APPLIANCES + generateSampleErrorAppliances()
    }
    response = generateResponse(header,payload)
    return response

def handleControl(event,context):
    payload = {}
    appliance_id = event['payload']['appliance']['applianceId']
    message_id = event['header']['messageId']
    request_name = event['header']['name']

    response_name = ''
    namespace = 'Alexa.ConnectedHome.Control'

    previous_temperature = 21.0
    minimum_temperature = 5.0
    maximum_temperature = 30.0

    if appliance_id == 'ThermostatAuto-001':
        previous_mode = 'AUTO'
        target_mode = 'AUTO'
        response = generateTemperatureResponse(event,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature)

    elif appliance_id == 'ThermostatHeat-001':
        previous_mode = 'HEAT'
        target_mode = 'HEAT'
        response = generateTemperatureResponse(event,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature)
    
    elif appliance_id == 'ThermostatCool-001':
        previous_mode = 'COOL'
        target_mode = 'COOL'
        response = generateTemperatureResponse(event,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature)

    elif isSampleErrorAppliance(appliance_id):
        response_name = appliance_id.replace('-001','')
        header = generateResponseHeader(event,response_name)
        payload = {}
        if response_name == 'ValueOutOfRangeError':
            payload = {
                'minimumValue': 5.0,
                'maximumValue': 30.0,
            }
        elif response_name == 'DependentServiceUnavailableError':
            payload = {
                'dependentServiceName': 'Customer Credentials Database',
            }
        elif response_name == 'TargetFirmwareOutdatedError' or response_name == 'TargetBridgeFirmwareOutdatedError':
            payload = {
                'minimumFirmwareVersion': '17',
                'currentFirmwareVersion': '6',
            }
        elif response_name == 'UnwillingToSetValueError':
            payload = {
                'errorInfo': {
                    'code': 'ThermostatIsOff',
                    'description': 'The requested operation is unsafe because it requires changing the mode.',
                }
            }
        elif response_name == 'RateLimitExceededError':
            payload = {
                'rateLimit': '10',
                'timeUnit': 'HOUR',
            }
        elif response_name == 'NotSupportedInCurrentModeError':
            payload = {
                'currentDeviceMode': 'AWAY',
            }
        elif response_name == 'UnexpectedInformationReceivedError':
            payload = {
                'faultingParameter': 'value',
            }

        response = generateResponse(header,payload)

    else:

        if request_name == 'TurnOnRequest': response_name = 'TurnOnConfirmation'
        if request_name == 'TurnOffRequest': response_name = 'TurnOffConfirmation'
        if request_name == 'SetTargetTemperatureRequest': 
            response_name = 'SetTargetTemperatureConfirmation'
            target_temperature = event['payload']['targetTemperature']['value']
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
            }
        if request_name == 'IncrementTargetTemperatureRequest':
            response_name = 'IncrementTargetTemperatureConfirmation'
            delta_temperature = event['payload']['deltaTemperature']['value']
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
            }        
        if request_name == 'DecrementTargetTemperatureRequest':
            response_name = 'DecrementTargetTemperatureConfirmation'
            delta_temperature = event['payload']['deltaTemperature']['value']
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
            }        
        if request_name == 'SetPercentageRequest': response_name = 'SetPercentageConfirmation'
        if request_name == 'IncrementPercentageRequest': response_name = 'IncrementPercentageConfirmation'
        if request_name == 'DecrementPercentageRequest': response_name = 'DecrementPercentageConfirmation'
        
        if appliance_id == 'sample-5':
            response_name = 'TargetOfflineError'
    
        header = generateResponseHeader(event,response_name)
        response = generateResponse(header,payload)

    return response

# utility functions
def generateSampleErrorAppliances():
    # this should be in sync with same list in validation.py
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

    sample_error_appliances = []
    device_number = 50

    for error in VALID_CONTROL_ERROR_RESPONSE_NAMES:
        sample_error_appliance = {
            'applianceId': error + '-001',
            'manufacturerName': SAMPLE_MANUFACTURER,
            'modelName': 'Switch',
            'version': '1',
            'friendlyName': 'Device ' + str(device_number),
            'friendlyDescription': error,
            'isReachable': True,
            'actions': [
                'turnOn',
                'turnOff',
            ],
            'additionalApplianceDetails': {}
        }

        if error == 'ValueOutOfRangeError':
            #sample_error_appliance['friendlyDescription'] = 'Utterance - Alexa set Device ' + str(device_number) + ' to 80 degrees. Response - ' + error,
            sample_error_appliance['modelName'] = 'Thermostat'
            sample_error_appliance['actions'] = [
                'setTargetTemperature',
                'incrementTargetTemperature',
                'decrementTargetTemperature',
            ]

        sample_error_appliances.append(sample_error_appliance)
        device_number = device_number + 1

    return sample_error_appliances

def isSampleErrorAppliance(appliance_id):
    sample_error_appliances = generateSampleErrorAppliances()
    for sample_error_appliance in sample_error_appliances:
        if sample_error_appliance['applianceId'] == appliance_id: return True
    return False

def generateResponseHeader(request,response_name):
    header = {
        'namespace': request['header']['namespace'],
        'name': response_name,
        'payloadVersion': '2',
        'messageId': request['header']['messageId'],        
    }
    return header

def generateResponse(header,payload):
    response = {
        'header': header,
        'payload': payload,
    }
    return response

def generateTemperatureResponse(request,previous_temperature,previous_mode,target_mode,minimum_temperature,maximum_temperature):
    request_name = request['header']['name']
    message_id = request['header']['messageId']
    
    # valid request    
    if request_name in ['SetTargetTemperatureRequest','IncrementTargetTemperatureRequest','DecrementTargetTemperatureRequest']:
        if request_name == 'SetTargetTemperatureRequest': 
            response_name = 'SetTargetTemperatureConfirmation'
            target_temperature = request['payload']['targetTemperature']['value']
        if request_name == 'IncrementTargetTemperatureRequest':
            response_name = 'IncrementTargetTemperatureConfirmation'
            target_temperature = previous_temperature + request['payload']['deltaTemperature']['value']
        if request_name == 'DecrementTargetTemperatureRequest':
            response_name = 'DecrementTargetTemperatureConfirmation'
            target_temperature = previous_temperature - request['payload']['deltaTemperature']['value']

        # valid target temperature
        if target_temperature <= maximum_temperature and target_temperature >= minimum_temperature:
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
            }
        else:
            response_name = 'ValueOutOfRangeError'
            payload = {
                'minimumValue': 5.0,
                'maximumValue': 30.0,
            }
    else:
        response_name = 'UnexpectedInformationReceivedError'
        payload = {
            'faultingParameter': 'request.name: ' + request_name
        }

    header = generateResponseHeader(request,response_name)
    response = generateResponse(header,payload)
    return response