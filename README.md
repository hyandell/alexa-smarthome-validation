# Alexa Smart Home Skill API Validation Package

This package provides modules in Node.js and Python that can be easily used in Lambda functions of Alexa Smart Home API skills to validate the responses before sending back to Alexa. The validation rules are based on the current [Smart Home Skill API reference](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference).

If a validation error is found, an exception is thrown by the Lambda function so that the skill developer can see those exceptions in CloudWatch and do something about them. Otherwise, although the Lambda function may have completed successfully, an error is sent back to Alexa, resulting in a failure for the Alexa user.

We encourage all Smart Home API skill developers to use this package as a way to ensure that their Lambda responses are always correct from the Alexa point of view, thereby improving operational excellence. As we add or modify the Smart Home Skill API, we will also update this package.

# How to Get Started

## Node.js

1. Get the validation.js file by cloning the project:
```bash
git clone https://github.com/alexa/alexa-smarthome-validation.git
```

2. Add the file to your Lambda function package. Assume it is in the same directory as your Lambda function.

3. At the top of your Lambda function, add:
```javascript
var validator = require('validation');
```

4. At the beginning of your Lambda handler function, add the context validation. For example:
```javascript
exports.handler = function(request, context) {
	try {
		validator.validateContext(request, response);
	} catch (error) {
	    log('FATAL', error);
	    throw(error);
	}
	...
```

5. Anytime you return a response, i.e. context.succeed(response), add a validation check in a try/catch block. For example:
```javascript
try {
    var response = {header, payload};
    validator.validateResponse(request, response);
    context.succeed(response);
} catch (error) {
    log('FATAL', error);
    throw(error);
}
```

Note that if you already have a live skill and you want to be safe, just wrap the call to validator.validateResponse in a try/catch block. This allows you to log an error for your reference, while still returning a response from your Lambda. For example:

```javascript
var response = {header, payload};
try {
    validator.validateResponse(request, response);
} catch (error) {
    log('FATAL', error);
}
context.succeed(response);
```

6. Test your skill with some bad responses to see if this works.

## Python

1. Get the validation.py file by cloning the project:
```bash
git clone https://github.com/alexa/alexa-smarthome-validation.git
```

2. Add the file to your Lambda function package. Assume it is in the same directory as your Lambda function.

3. At the top of your Lambda function, add:
```python
from validation import validateResponse, validateContext
```

4. At the beginning of your Lambda handler function, add the context validation. For example:
```python
def lambda_handler(event,context):
	try:
        validateContext(context)
    except ValueError as error:
        logger.error(error)
        raise
    ...        
```

5. Anytime you return a response, i.e. return(response), add a validation check in a try/catch block. For example:
```python
try:
    validateResponse(request,response)
    return response
except ValueError as error:
    logger.error(error)
    raise
```

Note that if you already have a live skill and you want to be safe, just wrap the call to validateResponse in a try/catch block. This allows you to log an error for your reference, while still returning a response from your Lambda. For example:

```python
try:
    validateResponse(request,response)
except ValueError as error:
    logger.error(error)
return response
```

6. Test your skill with some bad responses to see if this works.
