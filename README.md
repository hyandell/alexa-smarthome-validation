# Alexa Smart Home Skill API Validation Package

This package provides modules in Node.js and Python that can be easily used in Lambda functions of Alexa Smart Home API skills to validate the responses before sending back to Alexa. The validation rules are based on the current [Smart Home Skill API reference](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference).

If a validation error is found, an exception is thrown by the Lambda function so that the skill developer can see those exceptions in CloudWatch and do something about them. Otherwise, although the Lambda function may have completed successfully, an error is sent back to Alexa, resulting in a failure for the Alexa user.

We encourage all Smart Home API skill developers to use this package as a way to ensure that their Lambda responses are always correct from the Alexa point of view, thereby improving operational excellence. As we add or modify the Smart Home Skill API, we will also update this package.

Please provide feedback as well. If we've made a mistake, or if you have any questions about specific validations, please submit an issue here.

# How to Get Started

## Node.js

1. Get the validation.js file by cloning the project:
```bash
git clone https://github.com/alexa/alexa-smarthome-validation.git
```

Add the file to your Lambda function package. Assume it is in the same directory as your Lambda function.

At the top of your Lambda function, add:
```javascript
var validator = require('validation');
```

At the beginning of your Lambda handler function, add the context validation. For example:
```javascript
exports.handler = function(request, context) {
	try {
	    validator.validateContext(context);
	} catch (error) {
	    log('FATAL', error);
	    throw(error);
	}
	...
```

Your Lambda will immediately fail if your Lambda's timeout setting is greater than 7 seconds.

NOTE: If your skill has lock capabilities, you may need to set this timeout check to 60 seconds or more.

Then, anytime you return a response, i.e. context.succeed(response), add a validation check in a try/catch block. Note that if you already have a live skill and you want to be safe, just wrap the call to validator.validateResponse in a try/catch block. This allows you to log an error for your reference, while still returning a response from your Lambda. For example:
```javascript
var response = {header, payload};
try {
    validator.validateResponse(request, response);
} catch (error) {
    log('FATAL', error);
}
context.succeed(response);
```

Test your skill with some bad responses to see if this works. Then you should setup some CloudWatch alarms on error metrics for your Lambda to be alerted of these errors going forward.

## Python

Get the validation.py file by cloning the project:
```bash
git clone https://github.com/alexa/alexa-smarthome-validation.git
```

Add the file to your Lambda function package. Assume it is in the same directory as your Lambda function.

At the top of your Lambda function, add:
```python
from validation import validateResponse, validateContext
```

At the beginning of your Lambda handler function, add the context validation. For example:
```python
def lambda_handler(event,context):
	try:
        validateContext(context)
    except ValueError as error:
        logger.error(error)
        raise
    ...        
```

Your Lambda will immediately fail if your Lambda's timeout setting is greater than 7 seconds.

NOTE: If your skill has lock capabilities, you may need to set this timeout check to 60 seconds or more.

Then, anytime you return a response, i.e. context.succeed(response), add a validation check in a try/catch block. Note that if you already have a live skill and you want to be safe, just wrap the call to validator.validateResponse in a try/catch block. This allows you to log an error for your reference, while still returning a response from your Lambda. For example:
```python
try:
    validateResponse(request,response)
except ValueError as error:
    logger.error(error)
return response
```

Test your skill with some bad responses to see if this works. Then you should setup some CloudWatch alarms on error metrics for your Lambda to be alerted of these errors going forward.

# Sample Lambdas

This package also provides sample lambda.js and lambda.py files that you can use, to get started with developing a Smart Home skill, or to see how this validation package is used. Note that both sample Lambdas simply generate a number of virtual, stateless devices, including a number of "error" devices, so you can use those to hear what Alexa's response will be if your Lambda sends back an [Error message](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#error-messages).

# Updates

Please watch this repo as we will update these validation packages every time the Smart Home API is updated.

# Feedback

We welcome all feedback. Please create an issue in this repo if you have any questions, comments, or suggestions.
